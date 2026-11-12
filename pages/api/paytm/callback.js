// pages/api/paytm/callback.js
import PaytmChecksum from 'paytmchecksum';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const paytmParams = { ...req.body };
    const paytmChecksum = paytmParams.CHECKSUMHASH;
    delete paytmParams.CHECKSUMHASH;

    const isValid = await PaytmChecksum.verifySignature(
      paytmParams,
      process.env.PAYTM_MERCHANT_KEY,
      paytmChecksum
    );

    if (!isValid) {
      return res.status(400).send('Checksum mismatch');
    }

    // TODO: Update your Firebase order status here
    // const orderId = paytmParams.ORDERID;
    // const status = paytmParams.STATUS; // TXN_SUCCESS / TXN_FAILURE
    // await firebase.firestore().collection('hindmedicalsOrders').doc(orderId).update({...})

    // Redirect user back to your success/failure page
    const redirectUrl =
      paytmParams.STATUS === 'TXN_SUCCESS'
        ? `/order-success?orderId=${paytmParams.ORDERID}`
        : `/order-failed?orderId=${paytmParams.ORDERID}`;

    res.redirect(302, redirectUrl);
  } catch (err) {
    console.error(err);
    res.status(500).send('Callback error');
  }
}