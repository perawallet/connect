function setVhVariable() {
  // a vh unit is equal to 1% of the screen height
  // eslint-disable-next-line no-magic-numbers
  const vhUnit = window.innerHeight * 0.01;

  document.documentElement.style.setProperty("--pera-wallet-vh", `${vhUnit}px`);
}

export {setVhVariable};
