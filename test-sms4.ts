import axios from 'axios';

async function testSms() {
    let config = {
        username: 'theisbyri',
        password: 'yava0683',
        from: '+4530133857',
        to: '+4530133857',
        text: ''
    };

    config.text = 'Hello Klaus, your order is on the way. The driver will arrive in 12 minutes. You can track the driver live right here.'; // 120 chars, no special chars
    try {
        let response = await axios.get('https://www.12voip.com/myaccount/sendsms.php', { params: config });
        console.log('Result 1 (120 chars ascii):', response.data.includes('<result>1</result>') ? 'Success' : response.data);
    } catch(e) {}

    config.text = 'Høj Klaus, your årdre er på vej. Chaufføren ankommer om 12 minutter. You can track the driver live right here nu vi har over.'; // 127 chars, with special chars
    try {
        let response = await axios.get('https://www.12voip.com/myaccount/sendsms.php', { params: config });
        console.log('Result 2 (120 chars unicode):', response.data.includes('<result>1</result>') ? 'Success' : response.data);
    } catch(e) {}
}
testSms();
