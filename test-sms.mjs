const axios = require('axios');

async function testSms() {
    const config = {
        username: 'theisbyri',
        password: 'yava0683',
        from: '+4530133857',
        to: '+4530133857',
        text: 'test'
    };

    const url = `https://www.12voip.com/myaccount/sendsms.php`;

    try {
        console.log('Sending request...');
        const response = await axios.get(url, { params: config });
        console.log('Status:', response.status);
        console.log('Data:', response.data);
    } catch (error) {
        console.error('Fejl:', error.response ? error.response.data : error.message);
    }
}
testSms();
