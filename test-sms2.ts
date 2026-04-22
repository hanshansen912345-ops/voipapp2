import axios from 'axios';

async function testSms() {
    const config = {
        username: 'theisbyri',
        password: 'yava0683',
        from: '+4530133857',
        to: '+4530133857',
        text: 'Hej Klaus,\nDin ordre (2x Kage) er på vej! Din chauffør ankommer om 12 minutter. Spor live: http://localhost/track/123912'
    };
    try {
        const response2 = await axios.get('https://www.12voip.com/myaccount/sendsms.php', { params: config });
        console.log('Result 2 (www):', response2.data);
    } catch(e) {
         console.error('WWW Err', e.message);
    }
}
testSms();
