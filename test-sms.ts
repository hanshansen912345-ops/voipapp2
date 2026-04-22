import axios from 'axios';

async function testSms() {
    const config = {
        username: 'theisbyri',
        password: 'yava0683',
        from: '+4530133857',
        to: '+4530133857',
        text: 'testing 123'
    };
    try {
        const response = await axios.get('https://myaccount.12voip.com/clix/sendsms.php', { params: config });
        console.log('Result 1 (clix):', response.data);
    } catch(e) {
        console.error('CLIX Err', e.message);
    }

    try {
        const response2 = await axios.get('https://www.12voip.com/myaccount/sendsms.php', { params: config });
        console.log('Result 2 (www):', response2.data);
    } catch(e) {
         console.error('WWW Err', e.message);
    }
}
testSms();
