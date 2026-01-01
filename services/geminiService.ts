
import { GoogleGenAI } from "@google/genai";
import { TIKZ_SNIPPETS_CONTEXT } from "../constants";

const PRO_MODEL = "gemini-3-pro-preview"; 
const FAST_MODEL = "gemini-3-flash-preview";

const SYSTEM_INSTRUCTION = `
Bạn là một chuyên gia soạn thảo tài liệu Toán học và Kỹ thuật, bậc thầy về TikZ và SVG.
Nhiệm vụ: Xử lý và chuyển đổi mã TikZ sang SVG hoặc ngược lại với độ chính xác tuyệt đối.

%% QUY TẮC CỐT LÕI VỀ HÌNH HỌC %%
1. **Hình học phẳng (Plane Geometry)**: 
   - TUYỆT ĐỐI CHỈ DÙNG NÉT LIỀN (solid lines) cho mọi đường (đường cao, trung tuyến, phân giác, đường tròn...).
   - KHÔNG dùng nét đứt (dashed/dotted/dash dot).
2. **Hình học không gian (Space Geometry)**: 
   - Chỉ dùng nét đứt (dashed) cho các cạnh bị che khuất.
3. **Chú thích (Legend)**: 
   - KHÔNG vẽ bảng chú thích (Legend/Key) trừ khi có yêu cầu. Hãy đặt nhãn trực tiếp lên hình.

%% CHUYỂN ĐỔI TIKZ SANG SVG %%
Khi chuyển đổi mã TikZ sang SVG:
- Hãy mô phỏng chính xác các phép toán tọa độ trong TikZ (ví dụ: $(A)!(P)!(B)$ là hình chiếu, $(A)!0.5!(B)$ là trung điểm).
- Đảm bảo các mũi tên (arrows), góc vuông (right angle symbols) và nhãn (labels) được vẽ đúng vị trí.
- Luôn trả về mã <svg> hoàn chỉnh, độc lập, có viewBox và width/height phù hợp.
- Sử dụng font chữ dễ đọc cho các nhãn điểm.
`;

const extractTikz = (text: string) => {
  const match = text.match(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/);
  return match ? match[0] : text.replace(/```latex|```tikz|```/g, '').trim();
};

const extractSvg = (text: string) => {
  let clean = text.trim();
  // Tìm thẻ mở <svg
  const startIdx = clean.indexOf('<svg');
  if (startIdx === -1) return "";
  
  // Tìm thẻ đóng </svg> cuối cùng
  const endIdx = clean.lastIndexOf('</svg>');
  if (endIdx === -1) return clean.substring(startIdx); // Trường hợp đang stream dở
  
  return clean.substring(startIdx, endIdx + 6);
};

export const generateTikzFromDescription = async (description: string, deepReason: boolean = false): Promise<string> => {
  try {
    // Create a new instance right before call as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const config: any = {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: deepReason ? 0.2 : 0.1,
    };
    if (deepReason) config.thinkingConfig = { thinkingBudget: 10000 };

    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: `Context Snippets:\n${TIKZ_SNIPPETS_CONTEXT}\n\nYêu cầu: Hãy tạo mã TikZ cho mô tả sau: ${description}. Lưu ý quy tắc nét liền cho hình phẳng.`,
      config
    });
    return extractTikz(response.text || "");
  } catch (error) {
    throw new Error("Không thể tạo mã TikZ. Vui lòng thử lại.");
  }
};

export const generateDescriptionFromImage = async (base64Image: string): Promise<string> => {
  try {
    // Create a new instance right before call as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const match = base64Image.match(/^data:(.+);base64,(.+)$/);
    if (!match) throw new Error("Ảnh không hợp lệ");
    
    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType: match[1], data: match[2] } },
          { text: "Mô tả chi tiết bài toán hình học này để tôi có thể chuyển nó sang TikZ. Lưu ý phân biệt hình phẳng (nét liền) và hình không gian." }
        ]
      },
      config: {
        systemInstruction: "Bạn là chuyên gia phân tích đề bài toán học.",
        temperature: 0.1
      }
    });
    return response.text || "";
  } catch (error) {
    throw new Error("Lỗi khi đọc hình ảnh.");
  }
};

export const generateSvgFromTikz = async (
  tikzCode: string, 
  deepReason: boolean = false, 
  onChunk?: (chunk: string) => void
): Promise<string> => {
  try {
    // Create a new instance right before call as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Bạn là một trình biên dịch TikZ sang SVG. Hãy vẽ hình ảnh SVG từ mã TikZ sau đây. 
YÊU CẦU CỰC KỲ QUAN TRỌNG:
1. Phải tính toán chính xác tọa độ, đặc biệt là các phép chiếu (projection) và trung điểm.
2. Hình học phẳng: Dùng toàn bộ NÉT LIỀN (solid lines). KHÔNG ĐƯỢC CÓ NÉT ĐỨT.
3. Chỉ trả về duy nhất mã <svg>...</svg>. Không thêm văn bản giải thích nào khác.

Mã TikZ cần vẽ:\n${tikzCode}`;
    
    const config: any = { 
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0 
    };

    if (deepReason) {
      config.thinkingConfig = { thinkingBudget: 15000 };
    }

    if (onChunk) {
      const result = await ai.models.generateContentStream({
        model: FAST_MODEL,
        contents: prompt,
        config
      });
      let fullText = "";
      for await (const chunk of result) {
        fullText += chunk.text;
        const currentSvg = extractSvg(fullText);
        if (currentSvg) onChunk(currentSvg);
      }
      return extractSvg(fullText);
    } else {
      const response = await ai.models.generateContent({
        model: FAST_MODEL,
        contents: prompt,
        config
      });
      return extractSvg(response.text || "");
    }
  } catch (error) {
    throw new Error("Lỗi biên dịch SVG. Vui lòng kiểm tra lại mã TikZ.");
  }
};

export const generateTikzFromImage = async (base64Image: string, deepReason: boolean = false): Promise<string> => {
  try {
    // Create a new instance right before call as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const match = base64Image.match(/^data:(.+);base64,(.+)$/);
    if (!match) throw new Error("Ảnh không hợp lệ");
    
    const config: any = {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0,
    };
    if (deepReason) config.thinkingConfig = { thinkingBudget: 16000 };

    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType: match[1], data: match[2] } },
          { text: "Chuyển hình ảnh này sang mã TikZ. Tuân thủ quy tắc: Hình phẳng = Nét liền, Hình không gian = Nét đứt cho cạnh khuất." }
        ]
      },
      config
    });
    return extractTikz(response.text || "");
  } catch (error) {
    throw new Error("Lỗi trích xuất mã TikZ.");
  }
};
