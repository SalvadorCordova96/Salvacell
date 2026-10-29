import {spawn,spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {existsSync,lstatSync,mkdirSync,readdirSync,rmSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {testSessionCookie} from './seed-test-admin.mjs';

const root=resolve(import.meta.dirname,'..');
const wranglerDir=resolve(root,'.wrangler');
const playwrightCli=resolve(root,'node_modules/@playwright/test/cli.js');
const temporaryName=/^e2e-state-[A-Za-z0-9]+$/;
const testRunId=randomUUID();
mkdirSync(wranglerDir,{recursive:true});
const before=new Set(readdirSync(wranglerDir).filter(name=>temporaryName.test(name)));
const args=process.argv.slice(2).filter(argument=>argument!=='--');
const child=spawn(process.execPath,[playwrightCli,'test',...args],{cwd:root,env:{...process.env,SALVACEL_TEST_RUN_ID:testRunId,SALVACEL_TEST_SESSION_COOKIE:testSessionCookie},stdio:'inherit'});
let cleanupFailed=false;

function cleanupTemporaryDatabases(){
  const listed=spawnSync('docker',['ps','--all','--quiet','--filter',`label=salvacel.test-run=${testRunId}`],{encoding:'utf8'});
  if(listed.error||listed.status!==0){cleanupFailed=true;console.error('No se pudieron localizar las bases temporales E2E.',listed.error||listed.stderr);return;}
  for(const id of listed.stdout.split(/\r?\n/).filter(Boolean)){
    const removed=spawnSync('docker',['rm','--force',id],{encoding:'utf8'});
    if(removed.error||removed.status!==0){cleanupFailed=true;console.error(`No se pudo retirar la base temporal E2E ${id}.`,removed.error||removed.stderr);}
  }
}

function cleanupRunState(){
  for(const name of readdirSync(wranglerDir).filter(name=>temporaryName.test(name)&&!before.has(name))){
    const target=resolve(wranglerDir,name);
    try{
      if(dirname(target)!==wranglerDir)throw new Error(`Ruta fuera del directorio temporal: ${target}`);
      const info=lstatSync(target);
      if(!info.isDirectory()||info.isSymbolicLink())throw new Error(`El estado temporal no es un directorio normal: ${target}`);
      rmSync(target,{recursive:true,force:true,maxRetries:20,retryDelay:250});
      if(existsSync(target))throw new Error(`El estado temporal persiste después de limpiarlo: ${target}`);
    }catch(error){
      cleanupFailed=true;
      console.error(`No se pudo retirar el estado E2E creado por esta ejecución: ${target}`,error);
    }
  }
}

child.once('error',error=>{
  console.error('No se pudo iniciar Playwright.',error);
  cleanupTemporaryDatabases();
  cleanupRunState();
  process.exitCode=1;
});
child.once('close',(code,signal)=>{
  cleanupTemporaryDatabases();
  cleanupRunState();
  process.exitCode=cleanupFailed?1:(code??(signal?1:0));
});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>child.kill(signal));
