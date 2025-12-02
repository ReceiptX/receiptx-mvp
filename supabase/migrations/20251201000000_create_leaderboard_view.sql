-- Create leaderboard view for top referrers
-- Based on actual referrals table schema (no status column)
CREATE OR REPLACE VIEW v_top_referrers AS
SELECT 
  r.referrer_user_id,
  u.email as referrer_email,
  u.telegram_id as referrer_telegram_id,
  w.wallet_address as referrer_wallet_address,
  COUNT(DISTINCT r.id) as total_referrals,
  COUNT(DISTINCT CASE WHEN r.aia_awarded > 0 THEN r.id END) as rewarded_referrals,
  COALESCE(SUM(r.aia_awarded), 0) as total_aia_earned
FROM referrals r
LEFT JOIN users u ON u.id = r.referrer_user_id
LEFT JOIN user_wallets w ON w.user_id = r.referrer_user_id
WHERE r.referrer_user_id IS NOT NULL
GROUP BY r.referrer_user_id, u.email, u.telegram_id, w.wallet_address
ORDER BY total_referrals DESC, total_aia_earned DESC;

-- Test the view
SELECT * FROM v_top_referrers LIMIT 10;
