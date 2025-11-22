// Build-safe stub for Netlify/CI
module.exports = {
  mintRWT: () => { return { success: false, message: 'Stub: Blockchain minting disabled.' }; },
  isContractConfigured: false,
  processReferralBonus: () => { return { success: false, message: 'Stub: Referral bonus disabled.' }; }
};
