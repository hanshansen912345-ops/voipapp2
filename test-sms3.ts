import axios from 'axios';

async function testSms() {
    // Test 1: Just newlines
    let config = {
        username: 'theisbyri',
        password: 'yava0683',
        from: '+4530133857',
        to: '+4530133857',
        text: 'Hello Klaus.\nWe are arriving.'
    };
    try {
        let response = await axios.get('https://www.12voip.com/myaccount/sendsms.php', { params: config });
        console.log('Result Newlines:', response.data.includes('<result>1</result>') ? 'Success' : response.data);
    } catch(e) {}

    // Test 2: Danish characters
    config.text = 'Hej chaufør, vi er der snart';
    try {
        let response = await axios.get('https://www.12voip.com/myaccount/sendsms.php', { params: config });
        console.log('Result Danish chars:', response.data.includes('<result>1</result>') ? 'Success' : response.data);
    } catch(e) {}

    // Test 3: URLs
    config.text = 'Link: http://localhost/test';
    try {
        let response = await axios.get('https://www.12voip.com/myaccount/sendsms.php', { params: config });
        console.log('Result URL:', response.data.includes('<result>1</result>') ? 'Success' : response.data);
    } catch(e) {}
}
testSms();
