import { connect, goto } from './cdp-lib.mjs';

const cdp = await connect();
await goto(cdp, 'https://kwork.ru/search?query=%D0%BC%D0%BE%D0%B1%D0%B8%D0%BB%D1%8C%D0%BD%D0%BE%D0%B5%20%D0%BF%D1%80%D0%B8%D0%BB%D0%BE%D0%B6%D0%B5%D0%BD%D0%B8%D0%B5', 9000);
const text = await cdp.ev(`document.body.innerText`);
console.log('LEN=' + (text || '').length);
console.log((text || '').slice(0, 3000));
cdp.close();
process.exit(0);
