
// Common LaTeX commands triggered by "\"
export const LATEX_COMMANDS = [
  "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota", "kappa", "lambda", "mu", "nu", "xi", "pi", "rho", "sigma", "tau", "upsilon", "phi", "chi", "psi", "omega",
  "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Upsilon", "Phi", "Psi", "Omega",
  "frac", "sqrt", "sum", "prod", "int", "oint", "lim",
  "infty", "partial", "nabla", "approx", "sim", "cong", "equiv", "neq", "leq", "geq",
  "cdot", "times", "div", "pm", "mp",
  "cup", "cap", "subset", "supset", "in", "notin", "emptyset",
  "forall", "exists", "neg",
  "leftarrow", "rightarrow", "leftrightarrow", "Leftarrow", "Rightarrow", "Leftrightarrow",
  "longleftarrow", "longrightarrow", "longleftrightarrow", "Longleftarrow", "Longrightarrow", "Longleftrightarrow",
  "xrightarrow", "xRightarrow", "xleftarrow", "xLeftarrow",
  "mapsto", "longmapsto",
  "begin", "end", "text", "mathbf", "mathit", "mathcal", "mathbb"
];

// Environments triggered typically inside "{}" (e.g., after \begin) or checked when inside braces
export const LATEX_ENVIRONMENTS = [
  "matrix", "pmatrix", "bmatrix", "vmatrix", "Vmatrix",
  "cases", "align", "equation", "split", "gather", "array", "itemize", "enumerate"
];
