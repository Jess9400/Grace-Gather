import {readFile,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from '../mobile/node_modules/typescript/lib/typescript.js';
const source=await readFile('mobile/src/app/privacy.tsx','utf8');
const parsed=ts.createSourceFile('privacy.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let object;
function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(parsed)==='policy')object=node.initializer.getText(parsed);ts.forEachChild(node,visit);}
visit(parsed);if(!object)throw new Error('Missing policy source');
const policy=vm.runInNewContext('('+object+')',Object.create(null),{timeout:1000});
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const style='body{margin:0;background:#1b1612;color:#f4ebda;font:17px/1.65 system-ui}main{max-width:720px;margin:auto;padding:28px 24px 70px}h1,h2{font-family:Georgia,serif;line-height:1.2}h1{font-size:38px}h2{font-size:25px}a{color:#f0d6a2}a:focus-visible{outline:2px solid #f0d6a2;outline-offset:4px}nav{display:flex;gap:18px;flex-wrap:wrap}section{padding:20px 0;border-bottom:1px solid #f4ebda40}small{color:#c8bbaa}';
const shell=(title,body)=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} · Grace &amp; Gather</title><link rel="stylesheet" href="./support.css"></head><body><main><a href="./">← Grace &amp; Gather</a><h1>${title}</h1>${body}</main></body></html>`;
const intro='<p>The sections below describe the Grace &amp; Gather mobile app. The separate legacy browser prototype may behave differently.</p>';
const nav='<nav>'+Object.entries({en:'English',pt:'Português',es:'Español',ru:'Русский'}).map(([k,v])=>`<a href="#${k}">${v}</a>`).join('')+'</nav>';
const sections=nav+Object.entries(policy).map(([lang,sections])=>`<article id="${lang}" lang="${lang}">${sections.map(([title,body])=>`<section><h2>${escape(title)}</h2><p>${escape(body)}</p></section>`).join('')}</article>`).join('')+'<p><a href="mailto:hello@graceandgather.online">hello@graceandgather.online</a></p>';
const support=shell('Support','<p>Grace &amp; Gather · Spiritual wellbeing and journaling.</p><p><a href="mailto:hello@graceandgather.online">hello@graceandgather.online</a></p><p>For account, privacy or accessibility questions, include a description of the problem and your app version. Do not send journal entries, recordings, passwords or verification codes.</p><p>Grace &amp; Gather does not monitor journals or provide emergency response. For immediate danger, contact local emergency services or someone you trust.</p><p lang="pt">Para dúvidas sobre conta, privacidade ou acessibilidade, escreva para o email acima. Não envie seu diário, gravações, senhas ou códigos de acesso.</p><p lang="es">Para preguntas sobre cuenta, privacidad o accesibilidad, escribe al correo indicado. No envíes tu diario, audios, contraseñas ni códigos de acceso.</p><p lang="ru">По вопросам аккаунта, конфиденциальности и доступности пишите на указанный адрес. Не отправляйте дневник, записи, пароли или коды входа.</p><p><a href="./privacy.html">Privacy policy / Privacidade / Privacidad / Конфиденциальность</a></p>');
for (const dir of ['dist','mobile/public']) {
  await writeFile(`${dir}/support.css`,style);
  await writeFile(`${dir}/privacy.html`,shell('Privacy',(dir==='dist'?intro:'')+sections));
  await writeFile(`${dir}/support.html`,support);
}
console.log('Built Grace & Gather privacy and support pages.');
