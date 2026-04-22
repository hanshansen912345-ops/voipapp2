import axios from 'axios';

async function testSms() {
    let config = {
        username: 'theisbyri',
        password: 'yava0683',
        from: '+4530133857',
        to: '+4530133857',
        text: 'Hej Klaus,\nDin ordre er på vej! Din chauffør ankommer om 12 minutter. Spor live: https://ais-dev-je4odwnfkkij7wcgofoi5j-44664150953.europe-west2.run.app/track/12391212'
    };
    try {
        let response = await axios.get('https://www.12voip.com/myaccount/sendsms.php', { params: config });
        console.log('Result:', response.data.includes('<result>1</result>') ? 'Success' : response.data);
    } catch(e) {}
}
testSms();
