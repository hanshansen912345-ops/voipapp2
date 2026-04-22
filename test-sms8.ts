import axios from 'axios';

async function testSms() {
    let config = {
        username: 'theisbyri',
        password: 'yava0683',
        from: '+4530133857', // Fixed to +
        to: '004530133857', // Testing 0045 in 'to'
        text: 'Test number three'
    };
    try {
        let response = await axios.get('https://www.12voip.com/myaccount/sendsms.php', { params: config });
        console.log('To 0045:', response.data.includes('<result>1</result>') ? 'Success' : response.data);
    } catch(e) {}
}
testSms();
