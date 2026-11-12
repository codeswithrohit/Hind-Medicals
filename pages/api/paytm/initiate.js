// pages/api/paytm/initiate.js
import PaytmChecksum from 'paytmchecksum';
import https from 'https';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      orderId,
      amount,
      customerMobile,
      customerName,
      customerEmail = '',
    } = req.body;

    // Basic validation
    if (!orderId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid orderId or amount' });
    }

    const mid = process.env.PAYTM_MID;
    const merchantKey = process.env.PAYTM_MERCHANT_KEY;
    const website = process.env.PAYTM_WEBSITE || 'WEBSTAGING';
    const host = process.env.PAYTM_HOST || 'https://securegw-stage.paytm.in';
    const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/paytm/callback`;

    // 1. Prepare body (exactly as required by Paytm)
    const body = {
      requestType: 'Payment',
      mid: mid,
      websiteName: website,
      orderId: orderId,
      callbackUrl: callbackUrl,
      txnAmount: {
        value: Number(amount).toFixed(2), // must be string with 2 decimals
        currency: 'INR',
      },
      userInfo: {
        custId: customerMobile || `CUST_${Date.now()}`,
        mobile: customerMobile || '',
        email: customerEmail || '',
        firstName: customerName || '',
      },
    };

    // 2. Generate checksum using official library
    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(body),
      merchantKey
    );

    // 3. Final payload
    const paytmParams = {
      body,
      head: {
        signature: checksum,
      },
    };

    const postData = JSON.stringify(paytmParams);

    // 4. Call Paytm Initiate Transaction API
    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: host.replace('https://', ''),
        port: 443,
        path: `/theia/api/v1/initiateTransaction?mid=${mid}&orderId=${orderId}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const reqPaytm = https.request(options, (resPaytm) => {
        let data = '';
        resPaytm.on('data', (chunk) => (data += chunk));
        resPaytm.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON from Paytm'));
          }
        });
      });

      reqPaytm.on('error', reject);
      reqPaytm.write(postData);
      reqPaytm.end();
    });

    // 5. Check response
    if (
      response?.body?.resultInfo?.resultStatus === 'S' &&
      response?.body?.txnToken
    ) {
      return res.status(200).json({
        success: true,
        orderId,
        txnToken: response.body.txnToken,
        amount: Number(amount).toFixed(2),
        mid,
      });
    }

    console.error('Paytm Initiate Error:', response);
    return res.status(400).json({
      success: false,
      error: response?.body?.resultInfo?.resultMsg || 'Failed to initiate transaction',
      details: response,
    });
  } catch (error) {
    console.error('Paytm API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
}