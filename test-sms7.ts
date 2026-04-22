import axios from 'axios';

async function testSms() {
    let config = {
        username: 'theisbyri',
        password: 'yava0683',
        from: '004530133857', // using 0045 this time
        to: '+4530133857',
        text: 'Test number two'
    };
    try {
        let response = await axios.get('https://www.12voip.com/myaccount/sendsms.php', { params: config });
        console.log('From 0045:', response.data.includes('<result>1</result>') ? 'Success' : response.data);
    } catch(e) {}
}
testSms();
