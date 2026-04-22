import axios from 'axios';

async function testSms() {
    let config = {
        username: 'theisbyri',
        password: 'yava0683',
        from: '+4530133857', 
        to: '+45 30 13 38 57', // testing spaces
        text: 'Test number 4'
    };
    try {
        let response = await axios.get('https://www.12voip.com/myaccount/sendsms.php', { params: config });
        console.log('Spaces:', response.data.includes('<result>1</result>') ? 'Success' : response.data);
    } catch(e) {}
}
testSms();
