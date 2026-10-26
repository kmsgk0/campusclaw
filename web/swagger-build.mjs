import {mkdir,copyFile,writeFile} from 'node:fs/promises';
const dir='../static/dist/swagger';
await mkdir(dir,{recursive:true});
for(const name of ['swagger-ui.css','swagger-ui-bundle.js']) await copyFile(`node_modules/swagger-ui-dist/${name}`,`${dir}/${name}`);
await writeFile(`${dir}/init.js`,"SwaggerUIBundle({url:'/openapi.json',dom_id:'#swagger-ui',persistAuthorization:false});");
