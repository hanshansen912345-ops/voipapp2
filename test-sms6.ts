import axios from 'axios';

async function testSms() {
    // Test parentheses
    let config1 = {
        username: 'theisbyri',
        password: 'yava0683',
        from: '+4530133857',
        to: '+4530133857',
        text: 'Hej Klaus,\nDin ordre (2x Kage) er på vej!'
    };
    try {
        let response = await axios.get('https://www.12voip.com/myaccount/sendsms.php', { params: config1 });
        console.log('Parentheses:', response.data.includes('<result>1</result>') ? 'Success' : response.data);
    } catch(e) {}

    // Test localhost URL
    let config2 = {
        username: 'theisbyri',
        password: 'yava0683',
        from: '+4530133857',
        to: '+4530133857',
        text: 'Hej Klaus,\nSpor live: http://localhost/track/12'
    };
    try {
        let response = await axios.get('https://www.12voip.com/myaccount/sendsms.php', { params: config2 });
        console.log('Localhost URL:', response.data.includes('<result>1</result>') ? 'Success' : response.data);
    } catch(e) {}
}
testSms();
