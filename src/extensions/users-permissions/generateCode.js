function generateCode() {
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
 
    for (let i = 0; i < 3; i++) {
      code += Math.floor(Math.random() * 10);
    }
 
    for (let i = 0; i < 3; i++) {
      const index = Math.floor(Math.random() * letters.length);
      code += letters.charAt(index);
    }
 
    return code;
}

module.exports = {
    generateCode
}