// Stub générique vide pour les modules natifs sur web

// Export par défaut vide
export default {};

// Export nommés communs
export const codegenNativeCommands = () => {};
export const codegenNativeComponent = () => {};
export const requireNativeComponent = () => null;
export const requireNativeModule = () => ({});

// Pour compatibility avec différents patterns d'import
module.exports = {};
module.exports.default = {};
module.exports.codegenNativeCommands = () => {};
module.exports.codegenNativeComponent = () => {};
module.exports.requireNativeComponent = () => null;
module.exports.requireNativeModule = () => ({});
