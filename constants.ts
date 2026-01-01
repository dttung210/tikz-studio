
export const TIKZ_SNIPPETS_CONTEXT = `
%% =============== BẢNG BIẾN THIÊN & XÉT DẤU (tkz-tab) ===============
% Bảng biến thiên hàm bậc 3:
% \tkzTabInit[lgt=2,espcl=2.5]{$x$/1, $y'$/1, $y$/2}{$-\infty$, $1$, $3$, $+\infty$}
% \tkzTabLine{,+,0,-,0,+,}
% \tkzTabVar{-/$-\infty$, +/$4$, -/$0$, +/$+\infty$}

% Bảng xét dấu:
% \tkzTabInit[lgt=1.5,espcl=2]{$x$/1, $f(x)$/1}{$-\infty$, $-2$, $5$, $+\infty$}
% \tkzTabLine{,-,0,+,0,-,}

%% =============== LƯỢNG GIÁC (TRIGONOMETRY) ===============
% Đường tròn lượng giác & Họ nghiệm:
% \draw (0,0) circle (2cm); \draw[->] (-2.5,0)--(2.5,0); \draw[->] (0,-2.5)--(0,2.5);
% \filldraw[red] (30:2) circle (2pt) node[above right] {$\pi/6 + k2\pi$};
% \draw[dashed, red] (30:2) -- (30:2 |- 0,0) node[below] {$\frac{\sqrt{3}}{2}$};

%% =============== MIỀN NGHIỆM BẤT PHƯƠNG TRÌNH ===============
% Miền nghiệm hệ BPT x+y<=2 và x>=0:
% \begin{scope}
%   \clip (-1,-1) rectangle (3,3);
%   \fill[pattern=north east lines, pattern color=gray!50] (0,0) -- (0,2) -- (2,0) -- cycle;
%   \draw[thick] (0,2) -- (2,0) node[right] {$x+y=2$};
% \end{scope}

%% =============== HÌNH HỌC KHÔNG GIAN (3D) ===============
% Hình chóp S.ABCD:
% \coordinate (A) at (0,0); \coordinate (B) at (1.5,-1); \coordinate (C) at (4.5,-1); \coordinate (D) at (3,0);
% \coordinate (S) at (2,4);
% \draw (S)--(A)--(B)--(C)--(S)--(B) (S)--(D)--(C); \draw[dashed] (A)--(D)--(S) (A)--(C);

% Hình trụ (Cylinder):
% \draw (0,0) ellipse (1.5 and 0.5); \draw (0,4) ellipse (1.5 and 0.5);
% \draw (-1.5,0) -- (-1.5,4) (1.5,0) -- (1.5,4);

%% =============== THỐNG KÊ (STATISTICS) ===============
% Biểu đồ tần số (Histogram):
% \draw[fill=blue!20] (0,0) rectangle (1,3); \draw[fill=blue!20] (1,0) rectangle (2,5);
`;
