import {expect,test,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {mkdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import sharp from 'sharp';

test.describe.configure({mode:'serial'});

test.beforeEach(async({context})=>{
  await context.addCookies([{name:'salvacel_session',value:'e2eTemporarySessionToken0000000000000000000000000',url:'http://127.0.0.1:8789'}]);
});

const unique=()=>`${Date.now()}${Math.floor(Math.random()*1000)}`;
const navGroupForLabel=(label:string)=>({
  'Inicio':'Taller','Órdenes':'Taller','Refacciones':'Taller',
  'Clientes':'Clientes y proveedores','Presupuestos':'Clientes y proveedores','Proveedores':'Clientes y proveedores',
  'Cobros':'Cobros y control','Resumen':'Cobros y control','Datos':'Gestión del sistema','Administración':'Gestión del sistema','Configuraciones':'Gestión del sistema',
}[label]||'Taller');
async function navigateToModule(page:Page,label:string){
  if(label==='Refacciones'){
    await navigateToModule(page,'Órdenes');
    await page.getByRole('navigation',{name:'Secciones de órdenes'}).getByRole('button',{name:/^Refacciones/}).click();
    return;
  }
  const desktop=page.locator('.desktop-nav');
  if(await desktop.isVisible()){
    const target=desktop.locator('.nav-item').filter({hasText:label}).first();
    if(!await target.isVisible())await desktop.getByRole('button',{name:new RegExp(navGroupForLabel(label))}).click();
    await target.click();
    return;
  }
  const mobile=page.locator('.mobile-nav');
  const target=mobile.locator('.nav-item').filter({hasText:label}).first();
  if(await target.isVisible()){await target.click();return;}
  await mobile.getByRole('button',{name:'Más'}).click();
  await mobile.getByRole('menuitem',{name:new RegExp(label)}).click();
}

test('healthcheck responde sin consultar la API de datos',async({request})=>{
  const response=await request.get('/api/health');
  expect(response.status()).toBe(200);
  expect(await response.text()).toBe('ok');
});

test('asistente operativo abre un borrador visible sin guardarlo',async({page})=>{
  await page.route('**/api/assistant/chat',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    reply:'Preparé la recepción; revisa el formulario antes de guardar.',
    action:{type:'draft_order',draft:{firstName:'Ana',lastName:'Prueba',brand:'Samsung',model:'A15',problem:'Pantalla rota'}},
  })}));
  await page.goto('/?v=orders');
  await page.waitForLoadState('networkidle');
  const launcher=page.getByRole('button',{name:'Abrir asistente de Salvacel'});
  await expect(launcher).toHaveAttribute('aria-expanded','false');
  await launcher.click();
  await expect(page.getByRole('button',{name:'Cerrar asistente'})).toHaveAttribute('aria-expanded','true');
  const chat=page.getByRole('region',{name:'Asistente de Salvacel'});
  await expect(chat).toBeVisible();
  await chat.getByRole('textbox',{name:'Mensaje para el asistente'}).fill('Abre una recepción para Ana');
  await chat.getByRole('textbox',{name:'Mensaje para el asistente'}).press('Enter');
  await expect(chat.getByText('Preparé la recepción; revisa el formulario antes de guardar.')).toBeVisible();
  await chat.getByRole('button',{name:'Abrir formulario de recepción'}).click();
  await expect(page.getByRole('heading',{name:'Nueva recepción de equipos'})).toBeVisible();
  await expect(page.getByLabel('Modelo *')).toHaveValue('A15');
  await expect(page.getByRole('button',{name:'Abrir asistente de Salvacel'})).toBeVisible();
});

test('transcripción requiere aviso, conserva texto pausado y solo sugiere los datos',async({page})=>{
  await page.addInitScript(()=>{
    type Recognition={onresult:((event:{results:ArrayLike<ArrayLike<{transcript:string}>>})=>void)|null;onerror:((event:{error:string})=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void;abort:()=>void};
    const target=window as Window&{__latestRecognition?:Recognition};
    class MockRecognition implements Recognition{
      onresult:Recognition['onresult']=null;onerror:Recognition['onerror']=null;onend:Recognition['onend']=null;
      start(){target.__latestRecognition=this;}stop(){this.onend?.();}abort(){this.onend?.();}
    }
    Object.defineProperty(window,'SpeechRecognition',{configurable:true,value:MockRecognition});
  });
  let items:Record<string,unknown>[]=[];
  let sentTranscript='';
  await page.route('**/api/assistant/transcriptions**',async route=>{
    const request=route.request();
    if(request.method()==='GET'){
      const id=new URL(request.url()).searchParams.get('id');
      if(id){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:Number(id),transcript:sentTranscript})});return;}
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({enabled:true,privacyNotice:'Aviso sintético aprobado para E2E.',items})});return;
    }
    const body=request.postDataJSON() as {action:string;transcript?:string};
    if(body.action==='start'){await route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});return;}
    sentTranscript=body.transcript||'';
    const fields={firstName:'Ana',lastName:'Prueba',phone:'6861234567',brand:'Samsung',model:'A15',problem:'Pantalla rota',repairType:'Reparación de pantalla',intent:'reparación'};
    const card={id:77,status:'pendiente',createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+7*86400000).toISOString(),fields,summary:'Ana Prueba · Samsung A15 · Pantalla rota'};
    items=[card];
    await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({id:77,status:'pendiente',fields})});
  });
  let workshopWrites=0;
  page.on('request',request=>{if(request.url().endsWith('/api/taller')&&request.method()==='POST')workshopWrites+=1;});
  await page.goto('/?v=orders');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button',{name:'Abrir asistente de Salvacel'}).click();
  const panel=page.getByRole('region',{name:'Asistente de Salvacel'});
  await expect(panel.getByText(/podría enviar audio/)).toBeVisible();
  await expect(panel.getByRole('button',{name:'Iniciar transcripción'})).toBeDisabled();
  await panel.getByLabel('Confirmo que el cliente recibió el aviso aprobado antes de enviar voz o notas para interpretar.').check();
  await panel.getByRole('button',{name:'Iniciar transcripción'}).click();
  await expect(panel.getByText(/Micrófono activo/).first()).toBeVisible();
  await page.evaluate(()=>{
    type Recognition={onresult:((event:{results:ArrayLike<ArrayLike<{transcript:string}>>})=>void)|null};
    const latest=(window as Window&{__latestRecognition?:Recognition}).__latestRecognition;
    latest?.onresult?.({results:[[{transcript:'Me llamo Ana y mi Samsung tiene la pantalla rota.'}]]});
  });
  await expect(panel.getByRole('textbox',{name:'Texto reconocido o notas manuales'})).toHaveValue(/Me llamo Ana/);
  await panel.getByRole('button',{name:'Pausar'}).click();
  await panel.getByRole('button',{name:'Reanudar'}).click();
  await page.evaluate(()=>{
    type Recognition={onresult:((event:{results:ArrayLike<ArrayLike<{transcript:string}>>})=>void)|null};
    const latest=(window as Window&{__latestRecognition?:Recognition}).__latestRecognition;
    latest?.onresult?.({results:[[{transcript:'El modelo es A15.'}]]});
  });
  await expect(panel.getByRole('textbox',{name:'Texto reconocido o notas manuales'})).toHaveValue(/pantalla rota.*A15/);
  await panel.getByRole('button',{name:'Finalizar'}).click();
  await expect(panel.getByText('Ficha preparada. Revisa las sugerencias en el formulario antes de guardar.')).toBeVisible();
  expect(sentTranscript).toMatch(/Me llamo Ana.*El modelo es A15/);
  await panel.getByRole('button',{name:'Usar en nueva orden'}).click();
  await expect(page.getByRole('dialog').getByLabel('Nombre *')).toHaveValue('Ana');
  await expect(page.getByRole('dialog').getByLabel('Modelo *')).toHaveValue('A15');
  await expect(page.getByRole('dialog').getByText(/Revisa y corrige los campos sugeridos por transcripción/)).toBeVisible();
  await page.getByRole('dialog').getByRole('button',{name:'Cerrar'}).click();
  await page.getByRole('button',{name:'Cerrar asistente'}).click();
  await page.getByRole('button',{name:'Nueva orden'}).first().click();
  const form=page.getByRole('dialog');
  await expect(form.getByText('Conversación pendiente más reciente')).toBeVisible();
  await form.getByRole('button',{name:'Usar datos sugeridos'}).click();
  await expect(form.getByLabel('Nombre *')).toHaveValue('Ana');
  expect(workshopWrites).toBe(0);
});

test('sin API de voz permite pegar notas manuales y no guarda hasta confirmación',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(window,'SpeechRecognition',{configurable:true,value:undefined});
    Object.defineProperty(window,'webkitSpeechRecognition',{configurable:true,value:undefined});
  });
  let submitted='';
  await page.route('**/api/assistant/transcriptions**',async route=>{
    if(route.request().method()==='GET'){
      await route.fulfill({status:200,contentType:'application/json',body:'{"enabled":true,"privacyNotice":"Aviso sintético E2E.","items":[]}'});return;
    }
    const body=route.request().postDataJSON() as {action:string;transcript?:string};
    if(body.action==='start'){await route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});return;}
    submitted=body.transcript||'';
    await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({id:78,status:'pendiente',fields:{firstName:'Ana'}})});
  });
  let workshopWrites=0;
  page.on('request',request=>{if(request.url().endsWith('/api/taller')&&request.method()==='POST')workshopWrites+=1;});
  await page.goto('/?v=orders');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button',{name:'Abrir asistente de Salvacel'}).click();
  const panel=page.getByRole('region',{name:'Asistente de Salvacel'});
  await expect(panel.getByText(/no ofrece reconocimiento de voz/)).toBeVisible();
  await expect(panel.getByRole('button',{name:'Iniciar transcripción'})).toHaveCount(0);
  await panel.getByLabel('Confirmo que el cliente recibió el aviso aprobado antes de enviar voz o notas para interpretar.').check();
  await panel.getByRole('textbox',{name:'Texto reconocido o notas manuales'}).fill('Cliente solicita reparar un Samsung A15.');
  await panel.getByRole('button',{name:'Guardar notas e interpretar'}).click();
  await expect(panel.getByText('Ficha preparada. Revisa las sugerencias en el formulario antes de guardar.')).toBeVisible();
  expect(submitted).toBe('Cliente solicita reparar un Samsung A15.');
  expect(workshopWrites).toBe(0);
});

test('copiloto abre una orden encontrada dentro del contexto de Salvacel',async({page})=>{
  const customer=`CopilotoOrden${unique()}`;
  await page.goto('/?v=orders');
  await page.getByRole('button',{name:'Nueva orden'}).click();
  await createRecord(page,{name:customer});
  await page.getByRole('dialog').getByRole('button',{name:'Cerrar'}).click();
  const boot=await (await page.request.get('/api/taller')).json() as {orders:{id:number;firstName:string}[]};
  const order=boot.orders.find(item=>item.firstName===customer);
  expect(order).toBeTruthy();
  await page.route('**/api/assistant/chat',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    reply:`Encontré la orden SC-${String(order!.id).padStart(6,'0')}.`,
    action:{type:'open_order',orderId:order!.id},
  })}));
  const chat=page.getByRole('button',{name:'Abrir asistente de Salvacel'});
  await chat.click();
  const panel=page.getByRole('region',{name:'Asistente de Salvacel'});
  await panel.getByRole('textbox',{name:'Mensaje para el asistente'}).fill('Abre esta orden');
  await panel.getByRole('textbox',{name:'Mensaje para el asistente'}).press('Enter');
  await panel.getByRole('button',{name:'Abrir orden'}).click();
  const detail=page.getByRole('dialog');
  await expect(detail).toBeVisible();
  await expect(detail).toContainText(`SC-${String(order!.id).padStart(6,'0')}`);
});

test('copiloto abre el perfil de cliente exacto sin editarlo',async({page})=>{
  const customer=`CopilotoCliente${unique()}`;
  const created=await page.request.post('/api/taller',{data:{action:'createCustomer',customer:{firstName:customer,lastName:'García',phone:''}}});
  expect(created.ok()).toBeTruthy();
  const boot=await (await page.request.get('/api/taller')).json() as {customers:{id:number;firstName:string}[]};
  const profile=boot.customers.find(item=>item.firstName===customer);
  expect(profile).toBeTruthy();
  await page.route('**/api/assistant/chat',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    reply:`Encontré el perfil CLI-${String(profile!.id).padStart(6,'0')}.`,
    action:{type:'open_customer',customerId:profile!.id},
  })}));
  await page.goto('/?v=customers');
  await page.getByRole('button',{name:'Abrir asistente de Salvacel'}).click();
  const panel=page.getByRole('region',{name:'Asistente de Salvacel'});
  await panel.getByRole('textbox',{name:'Mensaje para el asistente'}).fill('Abre el perfil');
  await panel.getByRole('textbox',{name:'Mensaje para el asistente'}).press('Enter');
  await panel.getByRole('button',{name:'Abrir perfil del cliente'}).click();
  await expect(page.getByRole('heading',{name:customer,level:2})).toBeVisible();
  await expect(page.locator('.customer-profile-detail')).toContainText('PERFIL DEL CLIENTE');
});

test('la carga móvil QR no revela datos y la API de fotos exige sesión',async({page,request})=>{
  const mobile=await page.goto('/mobile-photos.html');
  expect(mobile?.status()).toBe(200);
  await expect(page.getByRole('heading',{name:'Fotos del equipo'})).toBeVisible();
  await expect(page.getByText(/No muestra datos del cliente ni otras órdenes/)).toBeVisible();
  const photos=await request.get('/api/photos?orderId=1');
  expect(photos.status()).toBe(401);
});

test('QR de orden canjea una sesión, sube una imagen ficticia y conserva acceso privado',async({page,context,request})=>{
  const customerName=`FotoQR${unique()}`;
  await page.goto('/?v=orders');
  await page.getByRole('button',{name:'Nueva orden'}).click();
  await createRecord(page,{name:customerName});
  const boot=await (await page.request.get('/api/taller')).json() as {orders:{id:number;firstName:string}[]};
  const order=boot.orders.find(item=>item.firstName===customerName);
  expect(order).toBeTruthy();

  const issued=await page.request.post('/api/photos/tokens',{data:{orderId:order!.id}});
  expect(issued.status()).toBe(201);
  const tokenData=await issued.json() as {mobileUrl:string};
  const token=new URL(tokenData.mobileUrl).hash.slice(1);
  expect(token).toMatch(/^[A-Za-z0-9_-]{40,64}$/);

  const mobile=await context.newPage();
  await mobile.goto(tokenData.mobileUrl);
  await expect(mobile.getByRole('status')).toContainText('Código listo');
  await mobile.getByRole('button',{name:'Iniciar carga de fotos'}).click();
  await expect(mobile.locator('#device')).toContainText('Samsung Galaxy A54');
  const png=await sharp({create:{width:32,height:32,channels:3,background:{r:38,g:94,b:220}}}).png().toBuffer();
  await mobile.locator('#photos').setInputFiles({name:'evidencia-sintetica.png',mimeType:'image/png',buffer:png});
  await mobile.getByRole('button',{name:'Subir fotos seleccionadas'}).click();
  await expect(mobile.getByRole('status')).toContainText('Foto guardada. 9 cargas restantes.');
  const screenshotDir=process.env.SALVACEL_UI_SCREENSHOT_DIR;
  if(screenshotDir){await mkdir(screenshotDir,{recursive:true});await mobile.screenshot({path:join(screenshotDir,'qr-upload-mobile-status.png'),fullPage:true});}

  const replay=await page.request.post('/api/photos/redeem',{data:{token},headers:{origin:'http://127.0.0.1:8789'}});
  expect(replay.status()).toBe(410);
  const photos=await page.request.get(`/api/photos?orderId=${order!.id}`);
  expect(photos.ok()).toBeTruthy();
  const photoData=await photos.json() as {photos:{id:number;original_name:string}[]};
  expect(photoData.photos).toHaveLength(1);
  expect(photoData.photos[0].original_name).toBe('evidencia-sintetica.png');
  const image=await page.request.get(`/api/photos/${photoData.photos[0].id}?variant=thumbnail`);
  expect(image.ok()).toBeTruthy();
  expect(image.headers()['content-type']).toContain('image/webp');

  const orderDetail=page.getByRole('dialog').first();
  await orderDetail.getByRole('button',{name:/Refacciones y cotizaciones/}).click();
  await orderDetail.getByRole('button',{name:'Actualizar fotos'}).click();
  const photoCard=orderDetail.locator('article').filter({hasText:'evidencia-sintetica.png'});
  await expect(photoCard.getByRole('button',{name:'Retirar'})).toBeVisible();
  await photoCard.getByRole('button',{name:'Retirar'}).click();
  const removeDialog=page.getByRole('dialog',{name:'Retirar foto del expediente'});
  await expect(removeDialog).toContainText('no libera espacio de almacenamiento');
  await removeDialog.getByRole('button',{name:'Conservar foto'}).click();
  await expect(page.getByRole('dialog').filter({hasText:'evidencia-sintetica.png'})).toBeVisible();
  await photoCard.getByRole('button',{name:'Retirar'}).click();
  const confirmRemoval=page.getByRole('dialog',{name:'Retirar foto del expediente'});
  await confirmRemoval.getByLabel('Motivo para la bitácora (opcional)').fill('Retiro de evidencia sintética en E2E');
  await confirmRemoval.getByRole('button',{name:'Confirmar retiro'}).click();
  await expect(orderDetail.getByText('No hay fotos en esta orden.')).toBeVisible();

  const anonymous=await request.get(`/api/photos?orderId=${order!.id}`);
  expect(anonymous.status()).toBe(401);
  const removedPhotos=await page.request.get(`/api/photos?orderId=${order!.id}`);
  expect((await removedPhotos.json() as {photos:unknown[]}).photos).toHaveLength(0);

  const secondQr=await page.request.post('/api/photos/tokens',{data:{orderId:order!.id}});
  expect(secondQr.status()).toBe(201);
  const secondTokenData=await secondQr.json() as {mobileUrl:string;tokenHash:string};
  const secondToken=new URL(secondTokenData.mobileUrl).hash.slice(1);
  const secondRedeem=await request.post('/api/photos/redeem',{headers:{Origin:'http://127.0.0.1:8789'},data:{token:secondToken}});
  expect(secondRedeem.ok()).toBeTruthy();
  const uploadSession=(await secondRedeem.json() as {session:string}).session;
  for(let index=0;index<10;index++){
    const uploaded=await request.post('/api/photos/upload',{headers:{Origin:'http://127.0.0.1:8789',Authorization:`Bearer ${uploadSession}`},multipart:{photo:{name:`cuota-${index}.png`,mimeType:'image/png',buffer:png}}});
    const uploadResult=await uploaded.json() as {remaining:number};
    expect(uploaded.status()).toBe(201);
    expect(uploadResult.remaining).toBe(9-index);
  }
  const overLimit=await request.post('/api/photos/upload',{headers:{Origin:'http://127.0.0.1:8789',Authorization:`Bearer ${uploadSession}`},multipart:{photo:{name:'cuota-excedida.png',mimeType:'image/png',buffer:png}}});
  expect(overLimit.status()).toBe(409);

  const thirdQr=await page.request.post('/api/photos/tokens',{data:{orderId:order!.id}});
  expect(thirdQr.status()).toBe(201);
  const thirdTokenData=await thirdQr.json() as {mobileUrl:string;tokenHash:string};
  const thirdToken=new URL(thirdTokenData.mobileUrl).hash.slice(1);
  const revoked=await page.request.delete('/api/photos/tokens',{headers:{Origin:'http://127.0.0.1:8789'},data:{tokenHash:thirdTokenData.tokenHash}});
  expect(revoked.ok(),await revoked.text()).toBeTruthy();
  const revokedRedeem=await request.post('/api/photos/redeem',{headers:{Origin:'http://127.0.0.1:8789'},data:{token:thirdToken}});
  expect(revokedRedeem.status()).toBe(410);
});

test('alerta persistente de respaldo lleva a Configuraciones',async({page})=>{
  await page.goto('/');
  const warning=page.getByRole('button',{name:/Aún no hay respaldo.*Ir a respaldo/});
  await expect(warning).toBeVisible();
  await warning.click();
  await expect(page.getByRole('heading',{name:'Configuraciones',level:1})).toBeVisible();
});

test('la cuenta vive en el pie de la navegación y no en un encabezado global',async({page})=>{
  await page.goto('/');
  await expect(page.locator('.topbar')).toHaveCount(0);
  await expect(page.locator('.sidebar-account')).toBeVisible();
  await expect(page.getByRole('button',{name:'Cerrar sesión'})).toBeVisible();
  await expect(page.getByRole('region',{name:'Avisos del taller'})).toBeVisible();
});

test('acción global abre una orden nueva desde Punto de venta',async({page})=>{
  await page.goto('/?v=pos');
  const createOrder=page.getByRole('button',{name:'Nueva orden',exact:true});
  await expect(createOrder).toBeVisible();
  await createOrder.click();
  await expect(page.getByRole('dialog',{name:/Nueva orden/i})).toBeVisible();
  await expect(page).toHaveURL(/v=pos/);
});

test('la carga inicial no genera errores de hidratación',async({page})=>{
  const runtimeErrors:string[]=[];
  page.on('pageerror',error=>runtimeErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')runtimeErrors.push(message.text());});
  await page.goto('/?v=home');
  await expect(page.locator('.home-page')).toBeVisible();
  await page.waitForTimeout(100);
  expect(runtimeErrors).toEqual([]);
});

test('Inicio destaca Punto de venta y Órdenes abre recepción con cotización por trabajo',async({page})=>{
  await page.goto('/?v=home');
  await expect(page.locator('a[aria-label^="WhatsApp de"]')).toHaveCount(0);
  await page.getByRole('button',{name:'Punto de venta',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Punto de venta',level:1})).toBeVisible();
  await navigateToModule(page,'Órdenes');
  await page.getByRole('button',{name:'Nueva recepción',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Nueva recepción de equipos'});
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Solicitar cotización para esta reparación').check();
  await expect(dialog.getByText('Clasifica al menos un proveedor activo para refacciones.')).toBeVisible();
});

test('Caja solo aparece dentro de Cobros y deja de renderizarse al cambiar de sección',async({page})=>{
  await page.goto('/?v=payments');
  await page.getByRole('tablist').getByRole('tab',{name:'Caja'}).click();
  await expect(page.locator('#cash-close-ticket')).toBeVisible();

  await navigateToModule(page,'Órdenes');
  await expect(page.getByRole('heading',{name:'Órdenes de reparación',level:1})).toBeVisible();
  await expect(page.locator('#cash-close-ticket')).toHaveCount(0);

  await navigateToModule(page,'Resumen');
  await expect(page.locator('#cash-close-ticket')).toHaveCount(0);

  await navigateToModule(page,'Cobros');
  await expect(page.locator('#cash-close-ticket')).toBeVisible();
});

test('gastos recurrentes se editan y pausan sin borrar la regla',async({page})=>{
  const name=`Internet ${unique()}`,updated=`Internet ${unique()}`;
  await page.goto('/?v=payments');
  await page.getByRole('tablist').getByRole('tab',{name:'Caja'}).click();
  const recurring=page.locator('.cash-management-grid .cash-control').nth(1);
  await recurring.getByPlaceholder('Renta, luz, internet…').fill(name);
  await recurring.getByLabel('Importe previsto').fill('250.00');
  await recurring.getByLabel('Primer vencimiento').fill('2026-12-15');
  await recurring.getByRole('button',{name:'Programar gasto recurrente'}).click();

  const rule=page.locator('.cash-recurring-row').filter({hasText:name}).first();
  await expect(rule).toContainText('activa');
  await rule.getByRole('button',{name:'Editar'}).click();
  const editor=rule.locator('form');
  await editor.locator('input[name="name"]').fill(updated);
  await editor.locator('input[name="amount"]').fill('375.50');
  await editor.locator('input[name="nextDueOn"]').fill('2027-01-01');
  await editor.locator('select[name="active"]').selectOption('0');
  await editor.getByRole('button',{name:'Guardar cambios'}).click();

  const saved=page.locator('.cash-recurring-row').filter({hasText:updated}).first();
  await expect(saved).toContainText('pausada');
  await expect(saved).toContainText('2027-01-01');
  await expect(saved).toContainText('$375.50');
});

test('la navegación lateral agrupa módulos y mantiene Punto de venta siempre accesible',async({page})=>{
  await page.setViewportSize({width:1280,height:700});
  await page.goto('/?v=home');
  const sidebar=page.locator('.sidebar');
  const navigation=page.locator('.desktop-nav');
  const pos=navigation.getByRole('button',{name:'Punto de venta'});
  await expect(pos).toBeVisible();
  await expect(navigation.getByRole('button',{name:/Taller/})).toBeVisible();
  await navigation.getByRole('button',{name:/Cobros y control/}).click();
  const settings=navigation.getByRole('button',{name:'Configuraciones'});
  await expect(settings).toBeVisible();
  await settings.scrollIntoViewIfNeeded();
  const settingsBox=await settings.boundingBox();
  const footerBox=await sidebar.locator('.sidebar-foot').boundingBox();
  const navMetrics=await navigation.evaluate(element=>({clientHeight:element.clientHeight,scrollHeight:element.scrollHeight,scrollTop:element.scrollTop}));
  expect(settingsBox).not.toBeNull();
  expect(footerBox).not.toBeNull();
  expect(navMetrics.scrollHeight).toBeGreaterThan(navMetrics.clientHeight);
  expect(navMetrics.scrollTop).toBeGreaterThan(0);
  expect(settingsBox!.y+settingsBox!.height).toBeLessThanOrEqual(footerBox!.y);
});

test('las pantallas principales no desbordan escritorio ni móvil',async({page})=>{
  test.setTimeout(90000);
  const runtimeErrors:string[]=[];
  page.on('pageerror',error=>runtimeErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')runtimeErrors.push(message.text());});
  const routes=[
    ['home','Inicio'],['summary','Resumen financiero'],['orders','Órdenes de reparación'],
    ['pos','Punto de venta'],['payments','Cobros'],['parts','Refacciones'],
    ['customers','Clientes'],['quotes','Presupuestos'],['suppliers','Proveedores y compras'],
    ['admin','Administración'],['settings','Configuraciones'],
  ] as const;

  for(const viewport of [
    {width:1440,height:900,label:'escritorio',mobileNavigation:false},
    {width:1024,height:768,label:'laptop/tablet',mobileNavigation:false},
    {width:768,height:900,label:'tablet',mobileNavigation:true},
    {width:390,height:844,label:'móvil',mobileNavigation:true},
    {width:320,height:700,label:'móvil estrecho',mobileNavigation:true},
  ]){
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    for(const [route,heading] of routes){
      await page.goto(`/?v=${route}`);
      await expect(page.locator('.page-heading h1')).toHaveText(heading);
      await expect(page.locator('.loading-skeleton')).toHaveCount(0);
      const dimensions=await page.evaluate(()=>{
        const viewport=document.documentElement.clientWidth;
        const overflowing=[...document.querySelectorAll<HTMLElement>('body *')].map(element=>({element,right:element.getBoundingClientRect().right})).filter(({element,right})=>right>viewport+1&&getComputedStyle(element).position!=='fixed').slice(-8).map(({element,right})=>({tag:element.tagName,className:element.className,text:element.innerText?.slice(0,60),right:Math.round(right)}));
        return {viewport,document:document.documentElement.scrollWidth,overflowing};
      });
      expect(dimensions.document,`${route} desborda horizontalmente en ${viewport.label}: ${JSON.stringify(dimensions.overflowing)}`).toBeLessThanOrEqual(dimensions.viewport);
      await expect(page.locator('#cash-close-ticket')).toHaveCount(0);
    }
    if(viewport.mobileNavigation){
      const verticalLayout=await page.evaluate(()=>{const ribbon=document.querySelector('[aria-label="Avisos del taller"]');const sidebar=document.querySelector('.sidebar');return {sidebarBottom:sidebar?.getBoundingClientRect().bottom??null,ribbonTop:ribbon?.getBoundingClientRect().top??null};});
      expect(verticalLayout.ribbonTop,`la franja de avisos debe permanecer disponible en móvil: ${JSON.stringify(verticalLayout)}`).not.toBeNull();
      if(verticalLayout.sidebarBottom!==null)expect(verticalLayout.ribbonTop,`la franja no debe cubrir la navegación móvil: ${JSON.stringify(verticalLayout)}`).toBeGreaterThanOrEqual(verticalLayout.sidebarBottom);
    }
  }
  expect(runtimeErrors).toEqual([]);
});

test('Órdenes móvil agrupa la ficha y conserva búsqueda, ordenamiento y acceso al detalle',async({page})=>{
  const customer=`Móvil${unique()}`;
  await page.goto('/?v=orders');
  await page.getByRole('button',{name:'Nueva orden'}).click();
  await createRecord(page,{name:customer});
  await page.getByRole('button',{name:'Cerrar',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await page.getByLabel('Buscar órdenes').fill(customer);

  const mobileList=page.locator('.orders-mobile-list');
  await expect(mobileList).toBeVisible();
  await expect(page.locator('.orders-desktop-table')).toBeHidden();
  await expect(page.locator('#orders-mobile-sort')).toHaveValue('date');
  await page.locator('#orders-mobile-sort').selectOption('client');
  await expect(page.locator('#orders-mobile-sort')).toHaveValue('client');
  const direction=mobileList.getByRole('button',{name:/Cambiar orden/});
  await expect(direction).toContainText('Ascendente');
  await direction.click();
  await expect(direction).toContainText('Descendente');

  const order=mobileList.locator('.accordion__item').filter({hasText:customer});
  await expect(order).toContainText('Samsung Galaxy A54');
  await order.locator('.accordion__trigger').click();
  await expect(order).toContainText('Teléfono');
  await expect(order).toContainText('Cambio de pantalla');
  await order.getByRole('button',{name:'Abrir detalle de la orden'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('catálogo permite editar y reordenar un servicio',async({page})=>{
  const name=`Servicio${unique()}`,edited=`${name} editado`,services=page.locator('.catalog-columns > div').nth(1);
  await page.goto('/?v=settings');
  await page.getByRole('tab',{name:'Catálogos'}).click();
  await services.getByLabel('Nombre del servicio *').fill(name);
  await services.getByLabel(/Precio base · MXN/).fill('800');
  await services.getByLabel(/Garantía · días/).fill('30');
  await services.getByRole('button',{name:'Agregar servicio'}).click();
  const serviceName=services.getByLabel(`Nombre de servicio ${name}`);
  await expect(serviceName).toHaveValue(name);
  await serviceName.fill(edited);
  await services.getByLabel(`Precio base de ${name}, MXN`).fill('850');
  await services.getByLabel(`Garantía de ${name} en días`).fill('45');
  await services.getByRole('button',{name:`Guardar servicio ${name}`}).click();
  await expect(services.getByLabel(`Nombre de servicio ${edited}`)).toHaveValue(edited);
  await services.getByRole('button',{name:`Subir servicio ${edited}`}).click();
  await expect(services.getByRole('button',{name:`Subir servicio ${edited}`})).toBeEnabled();
});

test('reordenar o desactivar un servicio no guarda otros cambios sin confirmar',async({page})=>{
  const suffix=unique(),first=`Servicio base ${suffix}`,second=`Servicio objetivo ${suffix}`;
  await page.goto('/?v=settings');
  await page.getByRole('tab',{name:'Catálogos'}).click();
  const services=page.locator('.catalog-columns > div').nth(1);
  for(const name of [first,second]){
    await services.getByLabel('Nombre del servicio *').fill(name);
    await services.getByRole('button',{name:'Agregar servicio'}).click();
    await expect(services.getByLabel(`Nombre de servicio ${name}`)).toHaveValue(name);
  }

  const serviceName=services.getByLabel(`Nombre de servicio ${second}`);
  await serviceName.fill(`Borrador sin guardar ${suffix}`);
  await services.getByLabel(`Precio base de ${second}, MXN`).fill('1350');
  await services.getByRole('button',{name:`Subir servicio ${second}`}).click();
  await expect(page.getByRole('status')).toContainText('Servicio reordenado');
  await services.getByRole('button',{name:`Desactivar servicio ${second}`}).click();
  await expect(page.getByRole('status')).toContainText('Servicio desactivado');

  await page.reload();
  await page.getByRole('tab',{name:'Catálogos'}).click();
  const reloadedServices=page.locator('.catalog-columns > div').nth(1);
  await expect(reloadedServices.getByLabel(`Nombre de servicio ${second}`)).toHaveValue(second);
  await expect(reloadedServices.getByLabel(`Precio base de ${second}, MXN`)).toHaveValue('0');
  await expect(reloadedServices.getByRole('button',{name:`Activar servicio ${second}`})).toBeVisible();
});

test('orden ofrece agregar al catálogo una marca nueva escrita',async({page})=>{
  const brand=`Marca${unique()}`;
  await page.goto('/?v=orders');
  await page.getByRole('button',{name:'Nueva orden'}).click();
  await page.getByLabel('Marca *').fill(brand);
  await page.getByRole('button',{name:`Agregar «${brand}» al catálogo`}).click();
  await expect(page.getByRole('status')).toHaveText(`«${brand}» agregada al catálogo.`);
  await expect(page.locator('#brands option').filter({hasText:brand})).toHaveCount(1);
  await page.getByRole('dialog').getByRole('button',{name:'Cancelar'}).click();
});

test('configuración guarda por sección y previsualiza el ticket real',async({page})=>{
  const note=`Nota de ticket ${unique()}`,businessName=`Salvacel ${unique()}`;
  await page.goto('/?v=settings');
  await expect(page.locator('.settings-required-note')).toHaveText('* Campo obligatorio.');
  const business=page.locator('#business');
  const workshopName=business.getByLabel('Nombre del taller *');
  await expect(workshopName).toHaveAttribute('required','');
  const savedName=await workshopName.inputValue();
  let businessWrites=0;
  page.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/api/taller')businessWrites+=1;});
  await workshopName.fill('');
  await business.getByRole('button',{name:'Guardar sección'}).click();
  await expect(workshopName).toBeFocused();
  expect(await workshopName.evaluate(element=>(element as HTMLInputElement).validity.valid)).toBe(false);
  expect(businessWrites).toBe(0);
  await workshopName.fill(businessName);
  await page.getByRole('button',{name:/Moneda y folios/}).click();
  const reviewRate=page.locator('#tariffs').getByLabel('Tarifa base de revisión · USD *');
  await expect(reviewRate).toHaveAttribute('required','');
  await page.getByRole('button',{name:/Tickets/}).click();
  const tickets=page.locator('#tickets');
  await tickets.getByLabel('Nota de orden').fill(note);
  await expect(tickets.locator('.thermal-ticket-preview .thermal-thanks')).toHaveText(note);
  await expect(tickets.getByText('Cambios sin guardar')).toBeVisible();
  await tickets.getByRole('button',{name:'Guardar sección'}).click();
  await expect(page.getByText('Sección guardada')).toBeVisible();
  await expect(workshopName).toHaveValue(businessName);
  await expect(business.getByText('Cambios sin guardar')).toBeVisible();
  await expect(tickets.getByLabel('Nota de orden')).toHaveValue(note);
  const response=await page.request.get('/api/taller');
  const boot=await response.json() as {settings:{ticketOrderNote:string;workshopName:string}};
  expect(boot.settings.ticketOrderNote).toBe(note);
  expect(boot.settings.workshopName).toBe(savedName);
  await business.getByRole('button',{name:'Guardar sección'}).click();
  await expect(workshopName).toHaveValue(businessName);
  const saved=await (await page.request.get('/api/taller')).json() as {settings:{workshopName:string}};
  expect(saved.settings.workshopName).toBe(businessName);
});

async function createRecord(page:Page,{quote=false,name=`Ana${unique()}`,deposit='0',unlockCode='',warrantyDays,imei='',accessoriesLeft='',physicalCondition='',promisedDate='',technician=''}:{quote?:boolean;name?:string;deposit?:string;unlockCode?:string;warrantyDays?:number;imei?:string;accessoriesLeft?:string;physicalCondition?:string;promisedDate?:string;technician?:string}={}){
  await page.getByLabel('Nombre *').fill(name);
  await page.getByLabel('Apellido *').fill('García');
  await page.getByLabel('Teléfono (opcional)').fill('686 123 4567');
  await page.getByLabel('Marca *').fill('Samsung');
  await page.getByLabel('Modelo *').fill('Galaxy A54');
  await page.getByLabel('Tipo de reparación *').fill('Cambio de pantalla');
  await page.getByLabel('Servicio / mano de obra').fill('100');
  if(quote)await page.getByLabel('Vigencia del presupuesto').fill('2030-01-01');
  else{
    if(Number(deposit)>0)await page.getByLabel('Anticipo').fill(deposit);
    if(unlockCode||warrantyDays!==undefined||imei||accessoriesLeft||physicalCondition||promisedDate||technician){await page.getByText('Más detalles del ingreso').click();if(unlockCode)await page.getByLabel('Código de desbloqueo').fill(unlockCode);if(warrantyDays!==undefined)await page.getByLabel('Días de garantía').fill(String(warrantyDays));if(imei)await page.getByLabel('IMEI o número de serie').fill(imei);if(accessoriesLeft)await page.getByLabel('Accesorios que deja').fill(accessoriesLeft);if(physicalCondition)await page.getByLabel('Estado físico').fill(physicalCondition);if(promisedDate)await page.getByLabel('Fecha prometida').fill(promisedDate);if(technician)await page.getByLabel('Técnico').fill(technician);}
  }
  await page.getByRole('dialog').getByRole('button',{name:quote?'Crear presupuesto':'Crear orden'}).click();
  await expect(page.getByText(quote?'Presupuesto creado':'Orden creada')).toBeVisible();
}

test('el directorio clasifica proveedores en una o varias categorías',async({page})=>{
  const name=`Proveedor clasificado ${unique()}`;
  await page.goto('/');
  await navigateToModule(page,'Proveedores');
  await page.getByRole('radiogroup',{name:'Proveedores y precios'}).getByRole('radio',{name:/Proveedores/}).click();
  await page.getByRole('button',{name:'Agregar proveedor'}).click();
  const form=page.locator('form.supplier-form');
  await form.getByLabel('Nombre *').fill(name);
  await form.getByRole('checkbox',{name:'Refacciones'}).check();
  await form.getByRole('checkbox',{name:'Accesorios'}).check();
  await form.getByRole('button',{name:'Guardar'}).click();
  const row=page.getByRole('row').filter({hasText:name});
  await expect(row).toContainText('Refacciones · Accesorios');
});

test('orden rápida permite solicitar cotización a proveedores activos clasificados para refacciones',async({page})=>{
  const supplierName=`Proveedor ${unique()}`,accessorySupplierName=`Solo accesorios ${unique()}`;
  const supplierResponse=await page.request.post('/api/taller',{data:{action:'createSupplier',name:supplierName,phone:'6861234567',notes:'Prueba E2E',suppliesParts:true,suppliesAccessories:false,active:true}});
  expect(supplierResponse.ok()).toBeTruthy();
  const accessorySupplierResponse=await page.request.post('/api/taller',{data:{action:'createSupplier',name:accessorySupplierName,phone:'6861234568',notes:'Proveedor de accesorios',suppliesParts:false,suppliesAccessories:true,active:true}});
  expect(accessorySupplierResponse.ok()).toBeTruthy();
  const orderName=`Cotización ${unique()}`;
  await page.goto('/?v=orders');
  await page.getByRole('button',{name:'Nueva orden'}).click();
  await page.getByLabel('Nombre *').fill(orderName);
  await page.getByLabel('Apellido *').fill('García');
  await page.getByLabel('Marca *').fill('Samsung');
  await page.getByLabel('Modelo *').fill('Galaxy A54');
  await page.getByLabel('Tipo de reparación *').fill('Cambio de pantalla');
  await page.getByLabel('Servicio / mano de obra').fill('100');
  await page.getByLabel('Refacción requerida (opcional)').fill('Pantalla Samsung A54');
  await page.getByRole('checkbox',{name:'Solicitar precio a proveedores'}).check();
  await expect(page.getByRole('checkbox',{name:accessorySupplierName})).toHaveCount(0);
  await page.getByRole('checkbox',{name:supplierName}).check();
  await page.getByRole('dialog').getByRole('button',{name:'Crear orden'}).click();
  await expect(page.getByText('Orden creada y solicitud de cotización registrada',{exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Cotizaciones de refacciones'})).toBeVisible();
  await expect(page.locator('.quote-request-card').getByText('Pantalla Samsung A54',{exact:true})).toBeVisible();
  await expect(page.getByText(supplierName,{exact:true})).toBeVisible();
  await expect(page.getByText('Sin respuesta',{exact:true})).toBeVisible();
});

test('orden, anticipo, liquidación e impresión sin código sensible',async({page})=>{
  const name=`Ana${unique()}`;
  await page.goto('/?v=orders');
  await page.getByRole('button',{name:'Nueva orden'}).click();
  await createRecord(page,{name,deposit:'30',unlockCode:'1234',imei:'IMEI-987650987650987',accessoriesLeft:'Funda y SIM',physicalCondition:'Rayón en esquina',promisedDate:'2030-01-02',technician:'Salvador'});
  await page.evaluate(()=>{window.print=()=>{};});
  await page.getByRole('button',{name:'Cerrar',exact:true}).click();
  await navigateToModule(page,'Cobros');
  const orderRow=page.getByRole('row').filter({hasText:name});
  await orderRow.getByRole('button',{name:'Registrar pago'}).click();
  await page.getByLabel('Importe del pago · MXN').fill('70');
  await page.getByRole('dialog').getByRole('button',{name:'Registrar pago'}).click();
  await expect(page.getByText('Pago registrado y adeudo actualizado')).toBeVisible();
  await navigateToModule(page,'Órdenes');
  await page.getByLabel('Buscar órdenes').fill(name);
  await page.getByRole('button',{name:/Abrir SC-/}).click();
  const detail=page.getByRole('dialog');
  const workSection=detail.getByRole('button',{name:/Datos y reparaciones/});
  await expect(workSection).toHaveAttribute('aria-expanded','true');
  await workSection.click();
  await expect(detail.getByText('Problema reportado')).toBeHidden();
  await workSection.click();
  await expect(detail.getByText('Problema reportado')).toBeVisible();
  await detail.getByRole('button',{name:/Refacciones y cotizaciones/}).click();
  await expect(page.getByRole('heading',{name:'Evidencia fotográfica'})).toBeVisible();
  await page.getByRole('button',{name:'Generar QR temporal'}).click();
  await expect(page.getByRole('img',{name:'Código QR temporal para subir fotos de esta orden'})).toBeVisible();
  await page.getByRole('button',{name:'Cancelar QR'}).click();
  await expect(page.getByRole('button',{name:'Generar QR temporal'})).toBeVisible();
  await page.getByRole('button',{name:'Imprimir ticket'}).click();
  await page.emulateMedia({media:'print'});
  const ticket=page.locator('#print-ticket');
  await expect(ticket).toBeVisible();
  await expect(ticket).toContainText('IMEI-987650987650987');
  await expect(ticket).toContainText('Funda y SIM');
  await expect(ticket).toContainText('Rayón en esquina');
  await expect(ticket).toContainText('Fecha prometida');
  await expect(ticket).toContainText('Salvador');
  await expect(ticket).not.toContainText('1234');
  await page.emulateMedia({media:'screen'});
  const movements=detail.getByRole('button',{name:/Movimientos de cobro/});
  if(await movements.getAttribute('aria-expanded')!=='true')await movements.click();
  const voidPaymentButton=detail.getByRole('button',{name:'Anular'}).first();
  await voidPaymentButton.click();
  const voidPaymentDialog=page.getByRole('dialog').filter({hasText:'Anular pago'});
  await expect(voidPaymentDialog).toContainText('conservará el motivo en la bitácora');
  await expect(voidPaymentDialog.getByRole('button',{name:'Confirmar anulación'})).toBeDisabled();
  await voidPaymentDialog.getByRole('button',{name:'Conservar pago'}).click();
  await expect(voidPaymentDialog).toBeHidden();
  await expect(detail.getByRole('button',{name:'Anular'}).first()).toBeVisible();
  await detail.getByRole('button',{name:'Anular'}).first().click();
  const reopenedVoidDialog=page.getByRole('dialog').filter({hasText:'Anular pago'});
  await reopenedVoidDialog.getByLabel('Motivo de anulación').fill('Corrección de prueba E2E.');
  await reopenedVoidDialog.getByRole('button',{name:'Confirmar anulación'}).click();
  await expect(reopenedVoidDialog).toBeHidden();
  await expect(detail.locator('.detail-payments')).toContainText('Anulado');
});

test('Refacciones separa pendientes de todas, busca y abre el seguimiento real',async({page})=>{
  const customer=`Piezas${unique()}`,availableCustomer=`Batería${unique()}`,pendingPart=`Pantalla pendiente ${unique()}`,availablePart=`Batería disponible ${unique()}`;
  await page.goto('/?v=orders');
  await page.getByRole('button',{name:'Nueva orden'}).click();
  await createRecord(page,{name:customer});
  await page.getByRole('button',{name:'Cerrar',exact:true}).click();

  const orderRow=page.getByRole('row').filter({hasText:customer});
  await orderRow.getByRole('button',{name:/Abrir SC-/}).click();
  await page.getByRole('button',{name:/Refacciones y cotizaciones/}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Agregar refacción'}).click();
  await page.getByRole('dialog',{name:'Agregar refacción requerida'}).getByLabel('Refacción requerida *').fill(pendingPart);
  await page.getByRole('dialog').getByRole('button',{name:'Guardar refacción'}).click();
  await expect(page.getByRole('status')).toHaveText('Refacción pendiente creada');

  await page.getByRole('button',{name:'Nueva orden'}).click();
  await createRecord(page,{name:availableCustomer});
  await page.getByRole('button',{name:'Cerrar',exact:true}).click();
  await page.getByRole('row').filter({hasText:availableCustomer}).getByRole('button',{name:/Abrir SC-/}).click();
  await page.getByRole('button',{name:/Refacciones y cotizaciones/}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Agregar refacción'}).click();
  await page.getByRole('dialog',{name:'Agregar refacción requerida'}).getByLabel('Refacción requerida *').fill(availablePart);
  await page.getByRole('dialog').getByRole('button',{name:'Guardar refacción'}).click();

  await page.getByRole('row').filter({hasText:availableCustomer}).getByRole('button',{name:/Abrir SC-/}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Actualizar'}).last().click();
  const edit=page.getByRole('dialog',{name:'Actualizar refacción'});
  await edit.getByLabel('Estado de la refacción').selectOption('disponible');
  await edit.getByLabel('Costo interno · MXN').fill('60');
  await edit.getByRole('button',{name:'Guardar refacción'}).click();

  await navigateToModule(page,'Refacciones');
  const pendingFilter=page.getByRole('radio',{name:/Pendientes/});
  const pendingCount=await pendingFilter.innerText();
  expect(Number(pendingCount.match(/\d+$/)?.[0])).toBeGreaterThanOrEqual(1);
  await expect(page.getByRole('row').filter({hasText:pendingPart})).toBeVisible();
  await expect(page.getByRole('row').filter({hasText:availablePart})).toHaveCount(0);

  await page.getByRole('radio',{name:/Todas/}).click();
  await expect(page.getByRole('row').filter({hasText:availablePart})).toContainText('$60.00');
  await page.getByLabel('Buscar refacción').fill(pendingPart);
  await expect(page.getByRole('row').filter({hasText:pendingPart})).toBeVisible();
  await expect(page.getByRole('row').filter({hasText:availablePart})).toHaveCount(0);
  await page.getByLabel('Buscar refacción').fill('');
  await page.getByRole('row').filter({hasText:pendingPart}).getByRole('button',{name:`Actualizar ${pendingPart}`}).click();
  await expect(page.getByRole('dialog',{name:'Actualizar refacción'}).getByLabel('Estado de la refacción')).toHaveValue('por_verificar');
  await page.getByRole('dialog').getByRole('button',{name:'Cerrar'}).click();
  if(process.env.SALVACEL_SCREENSHOT_DIR){
    await expect(page.getByRole('status')).toBeHidden({timeout:6000});
    const directory=process.env.SALVACEL_SCREENSHOT_DIR;
    await mkdir(directory,{recursive:true});
    await page.setViewportSize({width:1440,height:1000});
    for(const mode of ['dark','light'] as const){
      await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;},mode);
      await page.screenshot({path:join(directory,`salvacel-parts-desktop-${mode}.png`),fullPage:true});
    }
    await page.setViewportSize({width:390,height:844});
    for(const mode of ['dark','light'] as const){
      await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;},mode);
      await page.screenshot({path:join(directory,`salvacel-parts-mobile-${mode}.png`),fullPage:true});
    }
  }
  await page.getByRole('row').filter({hasText:pendingPart}).getByRole('button',{name:/Abrir orden SC-/}).click();
  await expect(page.getByRole('dialog')).toContainText(customer);
});

test('Datos organiza las tablas en un selector y deja la bitácora bajo demanda',async({page})=>{
  await page.goto('/?v=data');
  await page.getByRole('tab',{name:/Datos del taller/}).click();
  const tableSelect=page.locator('.data-table-select').getByRole('button');
  await expect(tableSelect).toBeVisible();
  await tableSelect.click();
  await page.getByRole('option',{name:/Refacciones/}).click();
  await expect(page.getByRole('textbox',{name:'Buscar en Refacciones'})).toBeVisible();
  if(process.env.SALVACEL_SCREENSHOT_DIR){
    const directory=process.env.SALVACEL_SCREENSHOT_DIR;
    await mkdir(directory,{recursive:true});
    for(const viewport of [{width:1440,height:900,label:'desktop'},{width:390,height:844,label:'movil'}]){
      await page.setViewportSize({width:viewport.width,height:viewport.height});
      for(const theme of ['dark','light'] as const){
        await page.evaluate(value=>{document.documentElement.dataset.theme=value;},theme);
        await page.waitForTimeout(200);
        await page.screenshot({path:join(directory,`datos-refacciones-${viewport.label}-${theme}.png`),fullPage:true});
      }
    }
  }
  const auditToggle=page.getByRole('button',{name:'Mostrar bitácora'});
  await expect(auditToggle).toHaveAttribute('aria-pressed','false');
  await auditToggle.click();
  await expect(auditToggle).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('heading',{name:'Bitácora y movimientos de inventario'})).toBeVisible();
});

test('Punto de venta vende; la gestión del catálogo vive en Administración',async({page})=>{
  await page.goto('/?v=pos');
  await expect(page.getByRole('radio',{name:'Catálogo',exact:true})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Accesorios'})).toBeVisible();
  await page.goto('/?v=admin');
  await expect(page.getByRole('heading',{name:'Catálogo e inventario'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Nuevo accesorio'})).toBeVisible();
});

test('Refacciones queda dentro de Órdenes y conserva el enlace anterior',async({page})=>{
  await page.goto('/?v=parts');
  await expect(page.getByRole('heading',{name:'Seguimiento de refacciones'})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Secciones de órdenes'})).toBeVisible();
  await expect(page.locator('.desktop-nav .nav-item').filter({hasText:/^Refacciones$/})).toHaveCount(0);
  await expect(page.getByRole('navigation',{name:'Secciones de órdenes'}).getByRole('button',{name:/^Refacciones/})).toHaveAttribute('aria-current','page');
});

test('la ficha lateral de Datos atrapa el foco y Escape lo devuelve a la fila',async({page})=>{
  const name=`Producto ficha ${unique()}`;
  await page.goto('/?v=admin');
  await page.getByRole('button',{name:'Nuevo accesorio'}).click();
  await page.getByLabel('Nombre *').fill(name);
  await page.getByRole('spinbutton',{name:/Precio de venta · MXN/}).fill('125');
  await page.getByLabel('Existencia inicial (opcional)').fill('2');
  await page.getByRole('button',{name:'Guardar accesorio'}).click();
  await expect(page.getByText('Accesorio agregado')).toBeVisible();

  await page.goto('/?v=admin');
  await page.getByRole('tab',{name:/Datos del taller/}).click();
  await page.locator('.data-table-select').getByRole('button').click();
  await page.getByRole('option',{name:/^Productos(?:\s+\d+)?$/}).click();
  await page.getByRole('textbox',{name:'Buscar en Productos e inventario'}).fill(name);
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Descargar catálogo completo'}).click();
  const download=await downloadPromise;
  const csv=await readFile((await download.path())!,'utf8');
  expect(csv).toContain('Costo de compra');
  expect(csv).toContain('Proveedores');
  expect(csv).toContain(name);
  expect(csv).toContain('125.00');
  const row=page.locator('.data-explorer tbody tr').filter({hasText:name});
  const openDetails=row.getByRole('button',{name:/Abrir ficha/});
  await openDetails.click();
  const dialog=page.getByRole('dialog',{name:name});
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('PRODUCTOS E INVENTARIO');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(openDetails).toBeFocused();
});

test('Configuraciones cambia el tema desde el grupo accesible de HeroUI',async({page})=>{
  await page.goto('/?v=settings');
  const appearance=page.getByRole('button',{name:/Interfaz/});
  if(await appearance.getAttribute('aria-expanded')!=='true')await appearance.click();
  const themes=page.getByRole('radiogroup',{name:'Tema de color'});
  await expect(themes).toBeVisible();
  const light=themes.getByRole('radio',{name:'Claro'});
  await light.click();
  await expect(light).toHaveAttribute('aria-checked','true');
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  const dark=themes.getByRole('radio',{name:'Oscuro'});
  await dark.click();
  await expect(dark).toHaveAttribute('aria-checked','true');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
});

test('Configuraciones explica zona horaria, moneda inicial y sentido del tipo de cambio',async({page})=>{
  await page.goto('/?v=settings');
  const timezone=page.getByLabel('Zona horaria');
  await expect(timezone).toHaveAttribute('aria-describedby','business-timezone-help');
  await expect(page.getByText(/Usa una zona IANA, por ejemplo America\/Tijuana/)).toBeVisible();

  const tariffs=page.getByRole('button',{name:/Moneda y folios/});
  await tariffs.click();
  const defaultCurrency=page.getByLabel('Moneda inicial de nuevas órdenes');
  await expect(defaultCurrency).toHaveAttribute('aria-describedby','default-currency-help');
  await expect(page.getByText(/Solo define el valor inicial de órdenes nuevas; no cambia órdenes existentes ni convierte importes guardados/)).toBeVisible();
  const exchangeRate=page.getByLabel('Tipo de cambio · MXN por USD');
  await expect(exchangeRate).toHaveAttribute('aria-describedby','review-exchange-help');
  await expect(page.getByText(/Convierte la tarifa de revisión de USD a MXN/)).toBeVisible();
  await expect(page.getByRole('heading',{name:'Prefijos de folio'})).toBeVisible();
});

test('Configuraciones agrupa sus áreas en pestañas y se adapta a móvil',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/?v=settings');
  const tabs=page.getByRole('tablist',{name:'Áreas de configuración'});
  await expect(tabs.getByRole('tab',{name:'Taller e interfaz'})).toHaveAttribute('aria-selected','true');
  const screenshotDir=process.env.SALVACEL_SCREENSHOT_DIR;
  if(screenshotDir){
    await mkdir(screenshotDir,{recursive:true});
    await page.setViewportSize({width:1440,height:900});
    for(const theme of ['dark','light'] as const){
      await page.evaluate(value=>{document.documentElement.dataset.theme=value;},theme);
      await page.screenshot({path:join(screenshotDir,`config-negocio-desktop-${theme}.png`),fullPage:true});
    }
    await page.setViewportSize({width:390,height:844});
    for(const theme of ['dark','light'] as const){
      await page.evaluate(value=>{document.documentElement.dataset.theme=value;},theme);
      await page.screenshot({path:join(screenshotDir,`config-negocio-movil-${theme}.png`),fullPage:true});
    }
  }

  for(const [label,heading] of [['Catálogos','Catálogos'],['Garantías','Garantía en entregas'],['Datos y seguridad','Datos, respaldos y seguridad']] as const){
    const tab=tabs.getByRole('tab',{name:label});
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected','true');
    await expect(page.getByRole('heading',{name:heading,level:2})).toBeVisible();
    if(label==='Catálogos')await expect(page.getByText(/Los métodos de pago activos aparecerán al registrar ventas, anticipos y devoluciones/)).toBeVisible();
    if(screenshotDir){
      for(const theme of ['dark','light'] as const){
        await page.evaluate(value=>{document.documentElement.dataset.theme=value;},theme);
        await page.screenshot({path:join(screenshotDir,`config-${label.toLocaleLowerCase().replaceAll(' ','-')}-movil-${theme}.png`),fullPage:true});
      }
    }
  }

  const widths=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});

test('administración permite crear y desactivar una cuenta desde la interfaz',async({page})=>{
  const username=`operador-${unique()}`;
  await page.goto('/?v=settings');
  await page.getByRole('tab',{name:'Datos y seguridad'}).click();
  const access=page.locator('.user-access-panel');
  await expect(access.getByRole('heading',{name:'Usuarios y permisos'})).toBeVisible();
  await access.getByLabel('Nombre de usuario *').fill(username);
  await access.getByLabel('Nombre visible *').fill('Operador E2E');
  await access.getByLabel('Contraseña inicial *').fill('prueba-segura-2026');
  await access.getByLabel('Rol permitido *').selectOption('tecnico');
  await access.getByRole('button',{name:'Crear cuenta'}).click();
  const account=access.locator('.user-access-row').filter({hasText:`@${username}`});
  await expect(account).toContainText('Operador E2E');
  await expect(account).toContainText('Activa');
  await account.getByRole('button',{name:'Restablecer contraseña'}).click();
  const reset=page.getByRole('dialog').filter({has:page.getByRole('heading',{name:'Restablecer contraseña'})});
  await reset.getByLabel('Nueva contraseña (mínimo 12 caracteres)').fill('contraseña-e2e-segura');
  await reset.getByLabel('Confirmar contraseña').fill('no-coincide-e2e');
  await expect(reset.getByRole('button',{name:'Confirmar cambio'})).toBeDisabled();
  await reset.getByLabel('Confirmar contraseña').fill('contraseña-e2e-segura');
  await reset.getByRole('button',{name:'Confirmar cambio'}).click();
  await expect(page.getByText('Contraseña restablecida; se revocaron sus sesiones anteriores.')).toBeVisible();
  await account.getByRole('button',{name:'Desactivar'}).click();
  await expect(account).toContainText('Inactiva');
});

test('alta sugiere clientes por teléfono y avisa reincidencia del equipo',async({page})=>{
  await page.goto('/?v=orders');
  await page.getByRole('button',{name:'Nueva orden'}).click();
  await page.getByLabel('Teléfono (opcional)').fill('686 123');
  const suggestion=page.locator('.client-suggestions button').first();
  await expect(suggestion).toBeVisible();
  await suggestion.click();
  await expect(page.getByLabel('Nombre *')).not.toHaveValue('');
  await expect(page.getByLabel('Teléfono (opcional)')).toHaveValue('686 123 4567');
  await page.getByLabel('Marca *').fill('Samsung');
  await page.getByLabel('Modelo *').fill('Galaxy A54');
  await expect(page.locator('.client-suggestions')).toContainText('Reincidencia');
  await page.getByRole('dialog').getByRole('button',{name:'Cancelar'}).click();
});

test('ticket de entrega calcula garantía y nunca imprime el código de desbloqueo',async({page})=>{
  const name=`Garantia${unique()}`,terms='Garantía de prueba: presentar este comprobante.';
  const bootResponse=await page.request.get('/api/taller');
  const boot=await bootResponse.json() as {settings:{revision:number}};
  const savedTerms=await page.request.post('/api/taller',{data:{action:'warrantyTerms',warrantyTerms:terms,revision:boot.settings.revision}});
  expect(savedTerms.ok(),`No se guardó la garantía: ${savedTerms.status()} ${await savedTerms.text()}`).toBeTruthy();
  await page.goto('/?v=orders');
  await page.getByRole('button',{name:'Nueva orden'}).click();
  await createRecord(page,{name,unlockCode:'CODIGO-PRIVADO',warrantyDays:30});
  await page.evaluate(()=>{window.print=()=>{};});
  const orderDetail=page.getByRole('dialog').first();
  await orderDetail.getByRole('button',{name:'Mostrar código de desbloqueo'}).click();
  const unlockDialog=page.getByRole('dialog').filter({has:page.getByRole('heading',{name:'Ver código de desbloqueo'})});
  await unlockDialog.getByRole('button',{name:'Mostrar código',exact:true}).click();
  await expect(orderDetail.locator('code')).toHaveText('CODIGO-PRIVADO');
  await orderDetail.getByRole('button',{name:'Ocultar código de desbloqueo'}).click();
  await page.getByRole('dialog').getByRole('button',{name:/Estado y garantía/}).click();
  await page.getByLabel('Estado de la orden').selectOption('proceso');
  await page.getByLabel('Estado de la orden').selectOption('terminada');
  await page.getByLabel('Estado de la orden').selectOption('entregada');
  const deliveryDialog=page.getByRole('dialog').filter({has:page.getByRole('heading',{name:'Confirmar entrega'})});
  await deliveryDialog.getByRole('button',{name:'Conservar estado'}).click();
  await expect(page.getByLabel('Estado de la orden')).toHaveValue('terminada');
  await page.getByLabel('Estado de la orden').selectOption('entregada');
  await page.getByRole('dialog').filter({has:page.getByRole('heading',{name:'Confirmar entrega'})}).getByRole('button',{name:'Confirmar entrega'}).click();
  await expect(page.getByText(/Garantía hasta/)).toBeVisible();
  await page.getByRole('button',{name:'Ticket de entrega'}).click();
  await page.emulateMedia({media:'print'});
  const ticket=page.locator('#print-ticket');
  await expect(ticket).toContainText(terms);
  await expect(ticket).toContainText('Garantía hasta');
  await expect(ticket).not.toContainText('CODIGO-PRIVADO');
});

test('presupuesto se convierte en una sola orden',async({page})=>{
  await page.goto('/?v=quotes');
  await page.locator('.page-heading .heading-actions').getByRole('button',{name:'Nuevo presupuesto'}).click();
  await createRecord(page,{quote:true,name:`Bruno${unique()}`});
  await expect(page.getByRole('dialog').getByRole('button',{name:'WhatsApp'})).toHaveCount(0);
  await page.getByRole('button',{name:'Convertir en orden'}).click();
  await expect(page.getByText('Presupuesto convertido en orden')).toBeVisible();
  await expect(page.getByText('Presupuesto de origen')).toBeVisible();
  await expect(page.getByRole('dialog').locator('.sc-badge.nueva')).toBeVisible();
});

test('filtros de presupuestos conservan su selección accesible y filtran la lista',async({page})=>{
  const quoteName=`Filtro${unique()}`;
  await page.goto('/?v=quotes');
  await page.locator('.page-heading .heading-actions').getByRole('button',{name:'Nuevo presupuesto'}).click();
  await createRecord(page,{quote:true,name:quoteName});
  await page.getByRole('button',{name:'Cerrar',exact:true}).click();
  const row=page.getByRole('row').filter({hasText:quoteName});
  await expect(row).toBeVisible();
  await page.getByRole('radio',{name:'Convertidos',exact:true}).click();
  await expect(row).toHaveCount(0);
  await page.getByRole('radio',{name:'Todos',exact:true}).click();
  await expect(row).toBeVisible();
  await page.getByRole('radio',{name:'Pendientes',exact:true}).click();
  await expect(row).toBeVisible();
});

test('presupuestos se leen y abren en una lista móvil sin desbordamiento',async({page})=>{
  const quoteName=`Movil${unique()}`;
  await page.goto('/?v=quotes');
  await page.locator('.page-heading .heading-actions').getByRole('button',{name:'Nuevo presupuesto'}).click();
  await createRecord(page,{quote:true,name:quoteName});
  await page.getByRole('button',{name:'Cerrar',exact:true}).click();
  const screenshotDir=process.env.SALVACEL_UI_SCREENSHOT_DIR;
  if(screenshotDir){
    await mkdir(screenshotDir,{recursive:true});
    await page.locator('.sc-toast').waitFor({state:'hidden'});
    await page.setViewportSize({width:1440,height:900});
    for(const theme of ['dark','light'] as const){
      await page.evaluate(value=>{document.documentElement.dataset.theme=value;},theme);
      await page.screenshot({path:join(screenshotDir,`presupuestos-escritorio-${theme}.png`),fullPage:false});
    }
  }
  await page.setViewportSize({width:390,height:844});
  if(screenshotDir){
    for(const theme of ['dark','light'] as const){
      await page.evaluate(value=>{document.documentElement.dataset.theme=value;},theme);
      await page.screenshot({path:join(screenshotDir,`presupuestos-movil-${theme}.png`),fullPage:false});
    }
  }
  const quoteRow=page.locator('.quote-mobile-row').filter({hasText:quoteName});
  await expect(quoteRow).toBeVisible();
  expect(await page.locator('body').evaluate(element=>element.scrollWidth)).toBeLessThanOrEqual(390);
  await quoteRow.getByRole('button',{name:/Abrir PR-/}).click();
  await expect(page.getByRole('dialog')).toContainText(quoteName);
});

test('venta de accesorio calcula el cambio correcto',async({page})=>{
  const sku=`USB${unique()}`;
  const supplierNames=[`Proveedor accesorio A ${unique()}`,`Proveedor accesorio B ${unique()}`];
  for(const name of supplierNames){const response=await page.request.post('/api/taller',{data:{action:'createSupplier',name,phone:'6861234567',notes:'Proveedor E2E de accesorios',suppliesParts:false,suppliesAccessories:true,active:true}});expect(response.ok()).toBeTruthy();}
  await page.goto('/?v=admin');
  await page.getByRole('button',{name:'Nuevo accesorio'}).click();
  const accessoryForm=page.locator('.product-form');
  await expect(accessoryForm.getByText('* Campo obligatorio.')).toBeVisible();
  await expect(accessoryForm.getByLabel('Nombre *')).toHaveAttribute('required','');
  await expect(accessoryForm.getByLabel('Existencia inicial (opcional)')).not.toHaveAttribute('required','');
  await page.getByLabel('Nombre *').fill(`Cable de prueba ${sku}`);
  await page.getByRole('button',{name:/Datos complementarios/}).click();
  await expect(page.getByLabel('Categoría (opcional)')).toBeVisible();
  await expect(page.getByLabel('Código / SKU (opcional)')).toBeVisible();
  await expect(page.getByLabel(/Costo de compra · MXN \(opcional\)/)).toBeVisible();
  await page.getByLabel('Compatibilidad (opcional)').fill('Compatible con un protector compatible universal');
  await page.getByLabel('Stock mínimo (opcional)').fill('3');
  for(const name of supplierNames)await page.getByLabel(name).check();
  await page.getByLabel('Código / SKU (opcional)').fill(sku);
  await page.getByRole('spinbutton',{name:/Precio de venta · MXN/}).fill('20');
  await page.getByRole('spinbutton',{name:/Costo de compra · MXN/}).fill('10');
  const currency=page.getByLabel('Moneda');
  await expect(currency).toHaveAttribute('aria-describedby','product-currency-hint');
  await expect(page.getByText(/Cambiar la moneda no convierte los importes/)).toBeVisible();
  await currency.selectOption('USD');
  await expect(page.getByRole('spinbutton',{name:/Precio de venta · USD/})).toHaveValue('20');
  await expect(page.getByRole('spinbutton',{name:/Costo de compra · USD/})).toHaveValue('10');
  await currency.selectOption('MXN');
  await page.getByLabel('Existencia inicial (opcional)').fill('3');
  await page.getByRole('button',{name:'Guardar accesorio'}).click();
  await expect(page.getByText('Accesorio agregado')).toBeVisible();
  await expect(page.locator('.catalog-stock-alert')).toContainText(`Cable de prueba ${sku} (3/3)`);
  await page.getByPlaceholder(/Nombre, categoría, código, compatibilidad o proveedor/).fill(sku);
  const inventoryTable=page.locator('.catalog-desktop-list tbody');
  await expect(inventoryTable.getByText(`Cable de prueba ${sku}`)).toBeVisible();
  const productRow=inventoryTable.locator('tr').filter({hasText:sku});
  await expect(productRow).toContainText('Compatible con un protector compatible universal');
  for(const name of supplierNames)await expect(productRow).toContainText(name);
  await page.getByRole('radio',{name:/Inactivos/}).click();
  await expect(inventoryTable.getByText(`Cable de prueba ${sku}`)).toHaveCount(0);
  await page.getByRole('radio',{name:/Todos/}).click();
  await page.getByRole('radio',{name:'Vender',exact:true}).click();
  await page.getByLabel('Buscar accesorios').fill(sku);
  await page.getByLabel('Buscar accesorios').press('Enter');
  await expect(page.getByRole('status').filter({hasText:'Captura el efectivo recibido'})).toContainText('$20.00 MXN');
  await page.getByLabel('Recibido · MXN').fill('50');
  await expect(page.getByRole('status').filter({hasText:'Captura el efectivo recibido'})).toHaveCount(0);
  await expect(page.locator('.change-row').getByText('$30.00 MXN')).toBeVisible();
  await page.evaluate(()=>{window.print=()=>{};});
  await page.getByRole('button',{name:'Cobrar e imprimir'}).click();
  await expect(page.getByText(/registrada/)).toBeVisible();
  await expect(page.locator('#print-ticket')).toContainText('$30.00');
  await page.getByRole('button',{name:/Ventas recientes/}).click();
  const saleRow=page.locator('tbody tr').filter({hasText:sku});
  await expect(saleRow).toBeVisible();
  await saleRow.getByRole('button',{name:'Anular'}).click();
  const voidDialog=page.getByRole('dialog');
  await expect(voidDialog).toContainText('escribe la palabra indicada');
  if(process.env.SALVACEL_SCREENSHOT_DIR){
    const directory=process.env.SALVACEL_SCREENSHOT_DIR;
    await mkdir(directory,{recursive:true});
    await page.screenshot({path:join(directory,'anular-venta-dialog.png'),fullPage:false});
  }
  const confirmVoid=voidDialog.getByRole('button',{name:'Confirmar anulación'});
  await expect(confirmVoid).toBeDisabled();
  await voidDialog.getByLabel('Escribe ANULAR para confirmar').fill('ANULAR');
  await voidDialog.getByLabel('Motivo de anulación').fill('Venta de prueba cancelada por E2E.');
  await expect(confirmVoid).toBeEnabled();
  await voidDialog.getByRole('button',{name:'Volver a ventas'}).click();
  await expect(voidDialog).toBeHidden();
  await expect(saleRow.getByRole('button',{name:'Anular'})).toBeVisible();
  await saleRow.getByRole('button',{name:'Anular'}).click();
  await voidDialog.getByLabel('Escribe ANULAR para confirmar').fill('ANULAR');
  await voidDialog.getByLabel('Motivo de anulación').fill('Venta de prueba cancelada por E2E.');
  await confirmVoid.click();
  await expect(voidDialog).toBeHidden();
  await expect(page.getByRole('status').filter({hasText:/VTA-\d+ anulada/})).toHaveText(/VTA-\d+ anulada/);
  await expect(saleRow.getByText('Anulada')).toBeVisible();
});

test('cambiar entre accesorios confirma antes de descartar y reinicia los campos del editor',async({page})=>{
  const suffix=unique(),firstName=`Accesorio primero ${suffix}`,secondName=`Accesorio segundo ${suffix}`;
  await page.goto('/?v=admin');
  for(const [name,price] of [[firstName,'120'],[secondName,'240']] as const){
    await page.getByRole('button',{name:'Nuevo accesorio'}).click();
    await page.getByLabel('Nombre *').fill(name);
    await page.getByRole('spinbutton',{name:/Precio de venta · MXN/}).fill(price);
    await page.getByLabel('Existencia inicial (opcional)').fill('1');
    await page.getByRole('button',{name:'Guardar accesorio'}).click();
    await expect(page.getByText('Accesorio agregado')).toBeVisible();
    await expect(page.locator('.product-form')).toBeHidden();
  }

  await page.getByRole('button',{name:`Editar ${firstName}`}).click();
  const editor=page.locator('.product-form');
  await expect(editor.getByLabel('Nombre *')).toHaveValue(firstName);
  const changedName=`Cambio sin guardar ${suffix}`;
  await editor.getByLabel('Nombre *').fill(changedName);
  await page.getByRole('button',{name:`Editar ${secondName}`}).click();
  const discardDialog=page.getByRole('dialog',{name:'Cambios sin guardar'});
  await expect(discardDialog).toBeVisible();
  await discardDialog.getByRole('button',{name:'Seguir editando'}).click();
  await expect(editor.getByLabel('Nombre *')).toHaveValue(changedName);
  await page.getByRole('button',{name:`Editar ${secondName}`}).click();
  await discardDialog.getByRole('button',{name:'Descartar y continuar'}).click();
  await expect(editor.getByLabel('Nombre *')).toHaveValue(secondName);
  await expect(editor.getByRole('spinbutton',{name:/Precio de venta · MXN/})).toHaveValue('240');
  await editor.getByLabel('Nombre *').fill(`Otro cambio pendiente ${suffix}`);
  await editor.getByRole('button',{name:'Cancelar'}).click();
  await expect(discardDialog).toBeVisible();
  await discardDialog.getByRole('button',{name:'Seguir editando'}).click();
  await expect(editor.getByLabel('Nombre *')).toHaveValue(`Otro cambio pendiente ${suffix}`);
  await editor.getByRole('button',{name:'Cancelar'}).click();
  await discardDialog.getByRole('button',{name:'Descartar y continuar'}).click();
  await expect(editor).toBeHidden();
});

test('inventario móvil agrupa cada accesorio y mantiene su edición real',async({page})=>{
  const sku=`MOV${unique()}`,name=`Funda móvil de edición especial con protección reforzada para el modelo de prueba ${sku}`;
  await page.goto('/?v=admin');
  await page.getByRole('button',{name:'Nuevo accesorio'}).click();
  const screenshotDir=process.env.SALVACEL_UI_SCREENSHOT_DIR;
  if(screenshotDir){
    await mkdir(screenshotDir,{recursive:true});
    await page.setViewportSize({width:1440,height:900});
    for(const theme of ['dark','light'] as const){
      await page.evaluate(value=>{document.documentElement.dataset.theme=value;},theme);
      await page.screenshot({path:join(screenshotDir,`form-accesorio-desktop-${theme}.png`),fullPage:true});
    }
    await page.setViewportSize({width:390,height:844});
    for(const theme of ['dark','light'] as const){
      await page.evaluate(value=>{document.documentElement.dataset.theme=value;},theme);
      await page.screenshot({path:join(screenshotDir,`form-accesorio-movil-${theme}.png`),fullPage:true});
    }
    await page.evaluate(()=>{document.documentElement.dataset.theme='dark';});
  }
  await page.getByLabel('Nombre *').fill(name);
  await page.getByRole('button',{name:/Datos complementarios/}).click();
  await page.getByLabel('Código / SKU (opcional)').fill(sku);
  await page.getByLabel('Compatibilidad (opcional)').fill('Proveedor de prueba: iPhone 13 y 14, por confirmar');
  await page.getByRole('spinbutton',{name:/Precio de venta · MXN/}).fill('180');
  await page.getByRole('spinbutton',{name:/Costo de compra · MXN/}).fill('80');
  await page.getByLabel('Existencia inicial (opcional)').fill('4');
  await page.getByRole('button',{name:'Guardar accesorio'}).click();
  await expect(page.getByText('Accesorio agregado')).toBeVisible();
  await expect(page.getByRole('cell',{name:'Proveedor de prueba: iPhone 13 y 14, por confirmar'})).toBeVisible();
  await page.getByRole('searchbox',{name:/Buscar en el catálogo/}).fill('iPhone 13');
  await expect(page.getByRole('cell',{name:'Proveedor de prueba: iPhone 13 y 14, por confirmar'})).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await page.locator('.catalog-mobile-list').getByRole('button').filter({hasText:name}).click();
  const expandedMobileDetails=page.locator('.catalog-mobile-details:visible');
  await expect(expandedMobileDetails.locator('dt').filter({hasText:'Compatibilidad'})).toBeVisible();
  await expect(expandedMobileDetails.getByText('Proveedor de prueba: iPhone 13 y 14, por confirmar')).toBeVisible();
  await page.setViewportSize({width:320,height:700});
  const toast=page.locator('.sc-toast');
  const toastBox=await toast.boundingBox();
  expect(toastBox).not.toBeNull();
  for(const selector of ['.mobile-nav','.global-new-order','.operator-chat-launcher']){
    const fixedControl=await page.locator(selector).boundingBox();
    if(!fixedControl||!toastBox)continue;
    const overlaps=toastBox.x<fixedControl.x+fixedControl.width&&toastBox.x+toastBox.width>fixedControl.x&&toastBox.y<fixedControl.y+fixedControl.height&&toastBox.y+toastBox.height>fixedControl.y;
    expect(overlaps,`el aviso no debe cubrir ${selector} en móvil`).toBeFalsy();
  }
  const navBox=await page.locator('.mobile-nav').boundingBox();
  const quickOrderBox=await page.locator('.global-new-order').boundingBox();
  const assistantBox=await page.locator('.operator-chat-launcher').boundingBox();
  expect(navBox).not.toBeNull();
  expect(quickOrderBox).not.toBeNull();
  expect(assistantBox).not.toBeNull();
  expect(quickOrderBox!.y+quickOrderBox!.height).toBeLessThanOrEqual(navBox!.y);
  const actionOverlap=quickOrderBox!.x<assistantBox!.x+assistantBox!.width&&quickOrderBox!.x+quickOrderBox!.width>assistantBox!.x&&quickOrderBox!.y<assistantBox!.y+assistantBox!.height&&quickOrderBox!.y+quickOrderBox!.height>assistantBox!.y;
  expect(actionOverlap,'Nueva orden y el acceso al asistente deben permanecer separados').toBeFalsy();
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('searchbox',{name:/Buscar en el catálogo/}).fill(sku);

  const inventory=page.locator('.catalog-mobile-list');
  await expect(inventory).toBeVisible();
  await expect(page.locator('.catalog-desktop-list')).toBeHidden();
  const item=inventory.locator('.accordion__item').filter({hasText:name});
  const summaryName=item.locator('.catalog-mobile-summary>span:first-child>strong');
  await expect(summaryName).toHaveText(name);
  expect(await summaryName.evaluate(element=>getComputedStyle(element).whiteSpace)).toBe('normal');
  await expect(item).toContainText('$180.00 MXN');
  await item.locator('.accordion__trigger').click();
  await expect(item).toContainText('$80.00 MXN');
  await expect(item).toContainText('Activo');
  await page.setViewportSize({width:320,height:700});
  expect(await page.locator('body').evaluate(element=>element.scrollWidth)).toBeLessThanOrEqual(320);
  const mobileScreenshotDir=process.env.SALVACEL_UI_SCREENSHOT_DIR;
  if(mobileScreenshotDir){await mkdir(mobileScreenshotDir,{recursive:true});await page.screenshot({path:join(mobileScreenshotDir,'inventario-movil-320.png'),fullPage:false});}
  const editButton=item.getByRole('button',{name:`Editar ${name}`});
  if(!(await editButton.isVisible()))await item.locator('.accordion__trigger').click();
  await editButton.click();
  const editForm=page.locator('.product-form');
  await expect(editForm.getByLabel('Existencia actual')).toHaveAttribute('readonly','');
  await expect(editForm.getByLabel('Existencia actual')).toHaveValue('4');
  await editForm.getByLabel('Nombre *').fill(`${name} sin guardar`);
  await editForm.getByRole('button',{name:'Ajustar existencia'}).click();
  await expect(editForm.getByRole('alert')).toHaveText('Guarda o cancela los cambios del accesorio antes de ajustar su existencia.');
  await expect(editForm.getByLabel('Nombre *')).toHaveValue(`${name} sin guardar`);
  await editForm.getByLabel('Nombre *').fill(name);
  await editForm.getByRole('button',{name:'Ajustar existencia'}).click();
  const adjustment=page.getByRole('dialog');
  await expect(adjustment).toContainText('existencia actual 4');
  await adjustment.getByRole('button',{name:'Cancelar'}).click();
  await expect(adjustment).toBeHidden();
  await item.getByRole('button',{name:`Editar ${name}`}).click();
  await page.getByRole('spinbutton',{name:/Precio de venta · MXN/}).fill('200');
  await page.getByRole('button',{name:'Guardar accesorio'}).click();
  await expect(page.getByText('Accesorio actualizado')).toBeVisible();
  await item.getByRole('button',{name:'Ajustar existencia'}).click();
  await expect(adjustment).toContainText('existencia actual 4');
  if(process.env.SALVACEL_UI_SCREENSHOT_DIR){await mkdir(process.env.SALVACEL_UI_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:join(process.env.SALVACEL_UI_SCREENSHOT_DIR,'ajustar-existencia-movil-320.png'),fullPage:false});}
  await adjustment.getByLabel('Cantidad · existencia actual 4').fill('5');
  await adjustment.getByRole('button',{name:'Cancelar'}).click();
  await expect(adjustment).toBeHidden();
  await expect(item).toContainText('4 en existencia');
  await item.getByRole('button',{name:'Ajustar existencia'}).click();
  await adjustment.getByLabel('Cantidad · existencia actual 4').fill('5');
  await adjustment.getByLabel('Motivo del movimiento').fill('Conteo físico E2E.');
  await adjustment.getByRole('button',{name:'Guardar movimiento'}).click();
  await expect(adjustment).toBeHidden();
  await expect(item).toContainText('9 en existencia');
  await item.getByRole('button',{name:`Editar ${name}`}).click();
  await page.getByLabel('Disponible para venta').uncheck();
  await page.getByRole('button',{name:'Guardar accesorio'}).click();
  await expect(page.getByText('Accesorio actualizado')).toBeVisible();
  await expect(item.locator('.sc-badge.inactivo')).toHaveText('Inactivo');
});

test('catálogos usa el ancho disponible, admite altas con teclado y se adapta a móvil',async({page})=>{
  await page.goto('/?v=settings');
  await page.getByRole('tab',{name:/Catálogos/}).click();
  const workspace=page.locator('.settings-workspace');
  const catalogPanel=page.locator('.settings-tab-panel').filter({has:page.locator('.catalog-settings')});
  const catalogCard=page.locator('.catalog-settings');
  await expect(catalogCard.getByText('* Campo obligatorio.')).toBeVisible();
  const workspaceWidth=await workspace.evaluate(element=>element.getBoundingClientRect().width);
  const panelWidth=await catalogPanel.evaluate(element=>element.getBoundingClientRect().width);
  const catalogCardWidth=await catalogCard.evaluate(element=>element.getBoundingClientRect().width);
  expect(panelWidth).toBeGreaterThan(workspaceWidth*.9);
  expect(catalogCardWidth).toBeGreaterThan(workspaceWidth*.9);
  const paymentGroup=catalogCard.locator('.catalog-group').filter({has:page.getByRole('heading',{name:'Métodos de pago'})});
  if(await paymentGroup.locator('input').count()){await expect(paymentGroup.getByText(/Nombre que aparece al cobrar/).first()).toBeVisible();await expect(paymentGroup.locator('input').first()).toHaveAttribute('aria-required','true');}

  const brand=`Marca UI ${unique()}`;
  const brandName=page.getByLabel('Nombre de la marca *');
  await expect(brandName).toHaveAttribute('required','');
  await brandName.fill(brand);
  await brandName.press('Enter');
  await expect(page.getByLabel(`Nombre de marca ${brand}`)).toHaveValue(brand);
  await expect(page.getByLabel(`Nombre de marca ${brand}`)).toHaveAttribute('aria-required','true');
  await expect(catalogCard.getByText('Nombre de marca *',{exact:true}).first()).toBeVisible();

  const service=`Servicio UI ${unique()}`;
  const serviceForm=page.getByRole('form',{name:'Agregar servicio'});
  const serviceNameInput=serviceForm.getByLabel('Nombre del servicio *');
  await expect(serviceNameInput).toHaveAttribute('required','');
  await expect(serviceForm.getByLabel(/Precio base.*opcional/)).toBeVisible();
  await expect(serviceForm.getByLabel(/Garantía · días.*opcional/)).toBeVisible();
  await serviceNameInput.fill(service);
  await serviceForm.getByLabel(/Precio base/).fill('175.50');
  await serviceForm.getByLabel(/Garantía · días/).fill('30');
  await serviceNameInput.press('Enter');
  await expect(page.getByRole('button',{name:`Guardar servicio ${service}`})).toBeVisible();
  await expect(page.getByLabel(`Nombre de servicio ${service}`)).toHaveAttribute('aria-required','true');

  await page.setViewportSize({width:390,height:844});
  const columnCount=await page.locator('.catalog-columns').evaluate(element=>getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length);
  expect(columnCount).toBe(1);
  expect(await page.locator('html').evaluate(element=>element.scrollWidth)).toBeLessThanOrEqual(390);
});

test('respaldo JSON restaura el estado anterior',async({page})=>{
  await page.goto('/?v=settings');
  const backupResponse=await page.request.get('/api/taller?export=json');
  expect(backupResponse.ok()).toBeTruthy();
  const backup=await backupResponse.body();
  const before=await backupResponse.json() as {schemaVersion:string;tables:{orders:unknown[];order_resolutions:unknown[];supplier_inbound_messages:unknown[];supplier_responses:unknown[];purchase_orders:unknown[];purchase_receipts:unknown[];repair_photo_upload_tokens:{token_hash:string;revoked_at:string|null;upload_session_hash:string|null}[];repair_photos:{id:number}[]}};
  expect(before.schemaVersion).toBe('0027');
  expect(Array.isArray(before.tables.order_resolutions)).toBeTruthy();
  expect(Array.isArray(before.tables.supplier_inbound_messages)).toBeTruthy();
  expect(Array.isArray(before.tables.supplier_responses)).toBeTruthy();
  expect(Array.isArray(before.tables.purchase_orders)).toBeTruthy();
  expect(Array.isArray(before.tables.purchase_receipts)).toBeTruthy();
  expect(Array.isArray(before.tables.repair_photo_upload_tokens)).toBeTruthy();
  expect(Array.isArray(before.tables.repair_photos)).toBeTruthy();
  const initialOrderCount=before.tables.orders.length;
  expect(initialOrderCount).toBeGreaterThanOrEqual(0);
  const name=`Restore${unique()}`;
  await navigateToModule(page,'Órdenes');
  await page.getByRole('button',{name:'Nueva orden'}).click();
  await createRecord(page,{name});
  const orderAfterCreate=await page.request.get('/api/taller');
  const createdData=await orderAfterCreate.json() as {orders:{firstName:string}[]};
  expect(createdData.orders.some(order=>order.firstName===name)).toBeTruthy();
  await page.getByRole('button',{name:'Cerrar',exact:true}).click();
  await navigateToModule(page,'Configuraciones');
  await page.getByRole('tab',{name:'Datos y seguridad'}).click();
  await page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({name:'salvacel-respaldo.json',mimeType:'application/json',buffer:backup});
  await page.getByLabel('Confirmación').fill('RESTAURAR');
  const previousBackupDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'Restaurar respaldo'}).click();
  await previousBackupDownload;
  await expect(page.getByText('Respaldo restaurado; se descargó una copia previa')).toBeVisible();
  const restoredJson=await page.request.get('/api/taller?export=json');
  const restoredBackup=await restoredJson.json() as {schemaVersion:string;tables:{repair_photo_upload_tokens:{token_hash:string;revoked_at:string|null;upload_session_hash:string|null}[];repair_photos:{id:number}[]}};
  expect(restoredBackup.schemaVersion).toBe('0027');
  expect(restoredBackup.tables.repair_photo_upload_tokens).toHaveLength(before.tables.repair_photo_upload_tokens.length);
  expect(restoredBackup.tables.repair_photo_upload_tokens.every(token=>!!token.revoked_at&&token.upload_session_hash===null)).toBeTruthy();
  expect(restoredBackup.tables.repair_photos).toHaveLength(before.tables.repair_photos.length);
  const restored=await page.request.get('/api/taller');
  const restoredData=await restored.json() as {orders:{firstName:string}[]};
  expect(restoredData.orders).toHaveLength(initialOrderCount!);
  expect(restoredData.orders.some(order=>order.firstName===name)).toBeFalsy();
  const recoveryListResponse=await page.request.get('/api/taller?recovery=1');
  const recoveryList=await recoveryListResponse.json() as {snapshots:{id:number;createdAt:string}[]};
  expect(recoveryList.snapshots).toHaveLength(1);
  const recoveryResponse=await page.request.get(`/api/taller?recovery=1&id=${recoveryList.snapshots[0].id}`);
  expect(recoveryResponse.ok()).toBeTruthy();
  const recovery=await recoveryResponse.json() as {schemaVersion:string;tables:{orders:{first_name:string}[];supplier_inbound_messages:unknown[];supplier_responses:unknown[];purchase_orders:unknown[];purchase_receipts:unknown[];repair_photo_upload_tokens:unknown[];repair_photos:unknown[]}};
  expect(recovery.schemaVersion).toBe('0027');
  expect(Array.isArray(recovery.tables.supplier_inbound_messages)).toBeTruthy();
  expect(Array.isArray(recovery.tables.supplier_responses)).toBeTruthy();
  expect(Array.isArray(recovery.tables.repair_photo_upload_tokens)).toBeTruthy();
  expect(Array.isArray(recovery.tables.repair_photos)).toBeTruthy();
  expect(recovery.tables.orders.some(order=>order.first_name===name)).toBeTruthy();
});

test('modal contiene y devuelve el foco; navegación móvil ofrece Más',async({page})=>{
  await page.goto('/?v=home');
  await navigateToModule(page,'Órdenes');
  await navigateToModule(page,'Cobros');
  await page.goBack();
  await expect(page.getByRole('heading',{name:'Órdenes de reparación'})).toBeVisible();

  const opener=page.getByRole('button',{name:'Nueva orden'});
  await opener.click();
  const dialog=page.getByRole('dialog',{name:'Nueva orden'});
  await expect(dialog).toBeVisible();
  for(let index=0;index<30;index++){
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(element=>element.contains(document.activeElement))).toBeTruthy();
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();

  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Más'}).click();
  await page.getByRole('menuitem',{name:'Proveedores'}).click();
  await expect(page.getByRole('heading',{name:'Proveedores y precios'})).toBeVisible();
});

test('la orden rápida guarda, recupera y permite descartar un borrador',async({page})=>{
  const firstName=`Borrador${unique()}`;
  await page.goto('/?v=orders');
  await page.getByRole('button',{name:'Nueva orden'}).click();
  let dialog=page.getByRole('dialog',{name:'Nueva orden'});
  await dialog.getByLabel('Nombre *').fill(firstName);
  await expect(dialog.getByRole('status')).toHaveText('Borrador guardado automáticamente.');
  await dialog.getByRole('button',{name:'Cancelar'}).click();

  await page.getByRole('button',{name:'Nueva orden'}).click();
  dialog=page.getByRole('dialog',{name:'Nueva orden'});
  await dialog.getByText('Recuperar borrador guardado (1)').click();
  await dialog.getByRole('button',{name:'Recuperar'}).click();
  await expect(dialog.getByLabel('Nombre *')).toHaveValue(firstName);
  await dialog.getByRole('button',{name:'Descartar'}).click();
  const discardDialog=page.getByRole('dialog',{name:'Descartar borrador'});
  await expect(discardDialog).toContainText('solo el borrador guardado');
  await discardDialog.getByRole('button',{name:'Conservar borrador'}).click();
  await expect(discardDialog).toBeHidden();
  const retained=await page.request.get('/api/drafts');
  expect((await retained.json() as {drafts:unknown[]}).drafts).toHaveLength(1);
  await dialog.getByRole('button',{name:'Descartar'}).click();
  const confirmation=page.getByRole('dialog',{name:'Descartar borrador'});
  const discarded=page.waitForResponse(response=>response.url().includes('/api/drafts')&&response.request().method()==='DELETE');
  await confirmation.getByRole('button',{name:'Descartar borrador'}).click();
  await discarded;
  const response=await page.request.get('/api/drafts');
  expect(response.ok()).toBeTruthy();
  expect((await response.json() as {drafts:unknown[]}).drafts).toHaveLength(0);
});

test('recepción crea varios equipos y trabajos bajo un solo perfil',async({page})=>{
  const name=`Cliente${unique()}`;
  await page.goto('/?v=customers');
  await page.getByRole('button',{name:'Nueva recepción'}).click();
  await page.getByLabel('Nombre *').fill(name);
  await page.getByLabel('Apellido *').fill('Pruebas');
  await page.getByLabel('Teléfono opcional').fill('686 123 4567');
  await page.getByLabel('Teléfono adicional (opcional)').fill('686 987 6543');
  const devices=page.locator('.reception-device');
  const first=devices.nth(0);
  await first.getByLabel('Marca *').fill('Samsung');
  await first.getByLabel('Modelo *').fill('A54');
  await first.getByLabel('Tipo de reparación *').fill('Cambio de pantalla');
  await first.getByLabel('Servicio / mano de obra').fill('100');
  await first.getByRole('button',{name:'Agregar trabajo'}).click();
  const repairs=first.locator('.reception-repair');
  await repairs.nth(1).getByLabel('Tipo de reparación *').fill('Cambio de centro de carga');
  await repairs.nth(1).getByLabel('Servicio / mano de obra').fill('50');
  await page.getByRole('button',{name:'Agregar equipo'}).click();
  const second=devices.nth(1);
  await second.getByLabel('Tipo de dispositivo *').selectOption('laptop');
  await second.getByLabel('Marca *').fill('Lenovo');
  await second.getByLabel('Modelo *').fill('IdeaPad');
  await second.getByLabel('Tipo de reparación *').fill('Cambio de teclado');
  await second.getByLabel('Servicio / mano de obra').fill('80');
  await page.getByRole('button',{name:'Registrar 2 equipos'}).click();
  await expect(page.getByRole('status')).toHaveText('2 órdenes creadas en la recepción');
  const boot=await (await page.request.get('/api/taller')).json() as {customers:{id:number;firstName:string}[];orders:{id:number;customerId:number|null;deviceType:string}[];orderRepairs:{orderId:number;repairType:string}[]};
  const customer=boot.customers.find(item=>item.firstName===name);
  expect(customer).toBeTruthy();
  const customerOrders=boot.orders.filter(order=>order.customerId===customer!.id);
  expect(customerOrders).toHaveLength(2);
  expect(customerOrders.some(order=>order.deviceType==='laptop')).toBeTruthy();
  expect(boot.orderRepairs.filter(repair=>customerOrders.some(order=>order.id===repair.orderId))).toHaveLength(3);
  await page.getByRole('dialog').getByRole('button',{name:'Cerrar'}).click();
  await navigateToModule(page,'Clientes');
  await page.getByRole('searchbox',{name:'Buscar clientes'}).fill('987 6543');
  await page.getByRole('option',{name:new RegExp(name)}).click();
  await expect(page.locator('.customer-profile-detail')).toContainText('686 123 4567');
  await expect(page.locator('.customer-profile-detail')).toContainText('686 987 6543');
  await page.getByRole('button',{name:'Editar perfil'}).click();
  await page.getByLabel('Teléfono adicional').fill('686 000 1122');
  await page.getByRole('button',{name:'Guardar perfil'}).click();
  await expect(page.locator('.customer-profile-detail')).toContainText('686 000 1122');
  const repairsTab=page.getByRole('tab',{name:/Reparaciones/});
  const purchasesTab=page.getByRole('tab',{name:/Compras/});
  await expect(repairsTab).toHaveAttribute('aria-selected','true');
  await expect(page.getByText('Cambio de pantalla · Cambio de centro de carga')).toBeVisible();
  await purchasesTab.click();
  await expect(purchasesTab).toHaveAttribute('aria-selected','true');
  await expect(page.getByText('Las ventas anónimas no se atribuyen a ningún perfil. Las ventas vinculadas aparecerán aquí.')).toBeVisible();
  await repairsTab.click();
  await expect(page.getByText('Cambio de pantalla · Cambio de centro de carga')).toBeVisible();
  await navigateToModule(page,'Órdenes');
  await page.getByRole('button',{name:'Nueva orden'}).click();
  await page.getByRole('searchbox',{name:'Buscar perfil por nombre o teléfono'}).fill('000 1122');
  const profileMatch=page.locator('.client-suggestions button').filter({hasText:name}).first();
  await profileMatch.click();
  await expect(page.getByLabel('Nombre *')).toHaveValue(name);
  await page.getByLabel('Marca *').fill('Motorola');
  await page.getByLabel('Modelo *').fill('Edge 50');
  await page.getByLabel('Tipo de reparación *').fill('Cambio de batería');
  await page.getByLabel('Servicio / mano de obra').fill('120');
  await page.getByRole('dialog').getByRole('button',{name:'Crear orden'}).click();
  await expect(page.getByText('Orden creada')).toBeVisible();
  const linkedBoot=await (await page.request.get('/api/taller')).json() as {customers:{id:number;firstName:string}[];orders:{id:number;customerId:number|null;brand:string;model:string}[]};
  const linkedOrder=linkedBoot.orders.find(order=>order.brand==='Motorola'&&order.model==='Edge 50');
  expect(linkedOrder?.customerId).toBe(linkedBoot.customers.find(item=>item.firstName===name)?.id);
  expect(linkedBoot.customers.filter(item=>item.firstName===name)).toHaveLength(1);
});

test('recepción abre el equipo y el campo requerido que falta antes de guardar',async({page})=>{
  await page.goto('/?v=customers');
  await page.getByRole('button',{name:'Nueva recepción'}).click();
  const dialog=page.getByRole('dialog',{name:'Nueva recepción de equipos'});
  await dialog.getByLabel('Nombre *').fill(`Validacion${unique()}`);
  await dialog.getByLabel('Apellido *').fill('Pruebas');
  const first=dialog.locator('.reception-device').nth(0);
  await first.getByLabel('Modelo *').fill('A54');
  await first.getByLabel('Tipo de reparación *').fill('Cambio de pantalla');
  await expect(dialog.getByRole('button',{name:'Registrar 1 equipo'})).toBeDisabled();
  await expect(dialog.getByText('Captura un importe mayor que cero en el equipo 1 para habilitar el registro.')).toBeVisible();
  await first.getByLabel('Servicio / mano de obra').fill('100');
  await expect(dialog.getByText('Captura un importe mayor que cero en el equipo 1 para habilitar el registro.')).toBeHidden();
  await dialog.getByRole('button',{name:'Agregar equipo'}).click();
  const second=dialog.locator('.reception-device').nth(1);
  await second.getByLabel('Marca *').fill('Apple');
  await second.getByLabel('Modelo *').fill('iPhone 15');
  await second.getByLabel('Tipo de reparación *').fill('Cambio de batería');
  await second.getByLabel('Servicio / mano de obra').fill('50');
  if(process.env.SALVACEL_SCREENSHOT_DIR){
    const directory=process.env.SALVACEL_SCREENSHOT_DIR;
    await mkdir(directory,{recursive:true});
    for(const viewport of [{width:1440,height:1000,label:'desktop'},{width:390,height:844,label:'movil'}]){
      await page.setViewportSize({width:viewport.width,height:viewport.height});
      for(const theme of ['dark','light'] as const){
        await page.evaluate(value=>{document.documentElement.dataset.theme=value;},theme);
        await dialog.evaluate(element=>{element.scrollTop=0;});
        await page.waitForTimeout(100);
        await page.screenshot({path:join(directory,`recepcion-equipos-${viewport.label}-${theme}.png`),fullPage:false});
      }
    }
  }
  await dialog.getByRole('button',{name:'Registrar 2 equipos'}).click();
  await expect(dialog.getByRole('alert')).toContainText('Completa la marca, el modelo y el tipo de reparación');
  const firstTrigger=dialog.getByRole('button',{name:/Equipo 1.*Marca pendiente/});
  await expect(firstTrigger).toHaveAttribute('aria-expanded','true');
  await expect(first.getByLabel('Marca *')).toBeFocused();
});

test('sesión individual protege la API y el acceso de prueba queda limitado',async({page})=>{
  await page.goto('/?v=home');
  await expect(page.locator('.home-page')).toBeVisible();
  const baseURL=new URL(page.url()).origin;
  const withoutCookie=await fetch(`${baseURL}/api/taller`);
  expect(withoutCookie.status).toBe(401);
  const auth=await page.request.get('/api/auth');
  expect(auth.ok()).toBeTruthy();
  const session=await auth.json() as {setupRequired:boolean;user:{roleKey:string;permissions:string[]}};
  expect(session.setupRequired).toBeFalsy();
  expect(session.user.roleKey).toBe('administrador');
  expect(session.user.permissions).toContain('*');
  const blockedSupplier=`Proveedor bloqueado ${unique()}`;
  const crossOriginMutation=await page.request.post('/api/taller',{headers:{Origin:'http://attacker.invalid'},data:{action:'createSupplier',name:blockedSupplier,phone:'6865551234',active:true}});
  expect(crossOriginMutation.status()).toBe(403);
  expect(await crossOriginMutation.text()).toContain('Origen de solicitud no permitido');
  const wrongSchemeMutation=await page.request.post('/api/taller',{headers:{Origin:'https://127.0.0.1:8789'},data:{action:'createSupplier',name:`Proveedor esquema incorrecto ${unique()}`,phone:'6865551235',active:true}});
  expect(wrongSchemeMutation.status()).toBe(403);
  const afterRejectedMutation=await page.request.get('/api/taller');
  const afterRejectedData=await afterRejectedMutation.json() as {suppliers:{name:string}[]};
  expect(afterRejectedData.suppliers.some(supplier=>supplier.name===blockedSupplier)).toBeFalsy();
  const invalidLogin=await fetch(`${baseURL}/api/auth`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',username:'e2e-admin',password:'incorrecta'})});
  expect(invalidLogin.status).toBe(401);
  expect(await invalidLogin.text()).toContain('Usuario o contraseña incorrectos');
  await page.context().clearCookies();
  await page.goto('/?v=home');
  await expect(page.getByRole('heading',{name:'Iniciar sesión'})).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Inicio'})).toHaveCount(0);
});

test('bandeja revisa una respuesta simulada con varias calidades antes de guardarla',async({page,request})=>{
  const supplierName=`Proveedor E2E ${unique()}`,supplierPhone=`686${String(Date.now()).slice(-7)}`,externalMessageId=`e2e-${unique()}`,token='e2e-agent-ingress-token-with-at-least-32-characters';
  const supplierResponse=await page.request.post('/api/taller',{data:{action:'createSupplier',name:supplierName,phone:supplierPhone,notes:'Proveedor de prueba',suppliesParts:true,suppliesAccessories:false,active:true}});
  expect(supplierResponse.ok(),await supplierResponse.text()).toBeTruthy();
  const supplier=await supplierResponse.json() as {id:number};
  const quoteResponse=await page.request.post('/api/taller',{data:{action:'createQuote',requestKey:randomUUID(),firstName:'Cliente',lastName:'Temporal',phone:'',brand:'Samsung',model:'A05',problem:'Consulta simulada',repairType:'Cambio de pantalla',notes:'',currency:'MXN',service:'100',parts:'0',applyReview:false}});
  expect(quoteResponse.ok(),await quoteResponse.text()).toBeTruthy();
  const quote=await quoteResponse.json() as {id:number};
  const priceRequestResponse=await page.request.post('/api/taller',{data:{action:'createSupplierPriceRequest',quoteId:quote.id,partName:'Pantalla Samsung A05',supplierIds:[supplier.id],notes:'Precio con envío y calidad'}});
  expect(priceRequestResponse.ok(),await priceRequestResponse.text()).toBeTruthy();
  const priceRequest=await priceRequestResponse.json() as {id:number};
  const bootResponse=await page.request.get('/api/taller');
  const boot=await bootResponse.json() as {priceRequestSuppliers:{id:number;priceRequestId:number;correlationRef:string}[]};
  const association=boot.priceRequestSuppliers.find(item=>item.priceRequestId===priceRequest.id);
  expect(association).toBeTruthy();

  const inboundResponse=await request.post('/api/agent/supplier-messages',{headers:{Authorization:`Bearer ${token}`},data:{action:'ingest',channel:'simulated',externalMessageId,sender:supplierPhone,correlationRef:association!.correlationRef,message:'Original en 700 más 100 de envío y genérica en 400 más 100; ambas llegan mañana.'}});
  expect(inboundResponse.status(),await inboundResponse.text()).toBe(201);
  const inbound=await inboundResponse.json() as {messageId:number};
  const proposalResponse=await request.post('/api/agent/supplier-messages',{headers:{Authorization:`Bearer ${token}`},data:{action:'proposal',messageId:inbound.messageId,confidence:.93,reason:'El proveedor indicó dos calidades, precios y entrega.',technicalSummary:'Dos opciones disponibles; total de cada opción incluye envío.',suggestedAssociationId:association!.id,offers:[{technicalSummary:'Pantalla original',price:'700',shipping:'100',quality:'Original',availability:'disponible',deliveryTime:'Mañana'},{technicalSummary:'Pantalla genérica',price:'400',shipping:'100',quality:'Genérica',availability:'disponible',deliveryTime:'Mañana'}]}});
  expect(proposalResponse.ok(),await proposalResponse.text()).toBeTruthy();
  await page.goto('/?v=quotes');
  const quoteRow=page.locator('tr').filter({hasText:'Cliente Temporal'}).filter({hasText:'Samsung A05'});
  await quoteRow.getByRole('button').first().click();
  const quoteDetail=page.getByRole('dialog',{name:'Samsung A05'});
  await expect(quoteDetail).toContainText('Respuesta interpretada');
  await expect(quoteDetail).toContainText(supplierName);
  await expect(quoteDetail).toContainText('700 MXN + 100 MXN envío');
  await expect(quoteDetail.getByRole('button',{name:'Confirmar y guardar oferta(s)'})).toBeEnabled();
  await quoteDetail.getByRole('button',{name:'Cerrar',exact:true}).click();

  await page.goto('/?v=suppliers');
  const tabs=page.getByRole('radiogroup',{name:'Proveedores y precios'});
  const inboxTab=tabs.getByRole('radio',{name:/Mensajes entrantes/});
  await inboxTab.click();
  await expect(inboxTab).toHaveAttribute('aria-checked','true');
  const card=page.locator('.supplier-inbox-card').filter({hasText:supplierName});
  const inboxTrigger=page.getByRole('button',{name:new RegExp(supplierName)});
  await expect(inboxTrigger).toHaveAttribute('aria-expanded','true');
  await inboxTrigger.click();
  await expect(inboxTrigger).toHaveAttribute('aria-expanded','false');
  await expect(card).toBeHidden();
  await inboxTrigger.click();
  await expect(inboxTrigger).toHaveAttribute('aria-expanded','true');
  if(process.env.SALVACEL_SCREENSHOT_DIR){
    const directory=process.env.SALVACEL_SCREENSHOT_DIR;
    await mkdir(directory,{recursive:true});
    for(const viewport of [{width:1440,height:1000,label:'desktop'},{width:390,height:844,label:'movil'}]){
      await page.setViewportSize({width:viewport.width,height:viewport.height});
      for(const theme of ['dark','light'] as const){
        await page.evaluate(value=>{document.documentElement.dataset.theme=value;},theme);
        await page.waitForTimeout(100);
        await page.screenshot({path:join(directory,`bandeja-proveedores-${viewport.label}-${theme}.png`),fullPage:false});
      }
    }
    const tabMetrics=await page.locator('.supplier-tabs').evaluate(element=>({clientWidth:element.clientWidth,scrollWidth:element.scrollWidth}));
    expect(tabMetrics.scrollWidth).toBeLessThanOrEqual(tabMetrics.clientWidth+1);
    await expect(tabs.getByRole('radio',{name:/Compras/})).toBeVisible();
  }
  await expect(inboxTrigger).toContainText('Revisión requerida');
  await expect(card).toContainText('Ver mensaje original');
  await expect(card).toContainText('Propuesta del agente');
  await expect(card.getByLabel('Solicitud a la que corresponde')).toHaveValue(String(association!.id));
  const options=card.locator('.supplier-inbox-offer');
  await expect(options).toHaveCount(2);
  await expect(options.nth(0).getByLabel('Resumen / variante')).toHaveValue('Pantalla original');
  await expect(options.nth(0).getByLabel('Precio')).toHaveValue('700');
  await expect(options.nth(0).getByLabel('Envío')).toHaveValue('100');
  await expect(options.nth(1).getByLabel('Resumen / variante')).toHaveValue('Pantalla genérica');
  await expect(options.nth(1).getByLabel('Precio')).toHaveValue('400');
  await expect(page.locator('.supplier-inbox')).toContainText('No se envían mensajes desde aquí.');
  await page.waitForTimeout(1000);
  await card.getByRole('button',{name:'Agregar opción'}).click();
  await expect(options).toHaveCount(3);
  await options.nth(2).getByRole('button',{name:'Quitar opción'}).click();
  await expect(options).toHaveCount(2);
  const confirmButton=card.getByRole('button',{name:'Confirmar y guardar ofertas'});
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();
  await expect(page.getByRole('status')).toHaveText('Mensaje asociado; ofertas guardadas para la orden.');
  await expect(inboxTrigger).toContainText('Asociado');
  await expect(card).toContainText('La selección de compra sigue siendo manual.');

  const afterResponse=await page.request.get('/api/taller');
  const after=await afterResponse.json() as {supplierInboxMessages:{id:number;status:string}[];supplierResponses:{inboundMessageId:number|null;quality:string;priceCents:number|null;shippingCents:number|null}[]};
  expect(after.supplierInboxMessages.find(item=>item.id===inbound.messageId)?.status).toBe('linked');
  const savedOffers=after.supplierResponses.filter(item=>item.inboundMessageId===inbound.messageId);
  expect(savedOffers).toHaveLength(2);
  expect(savedOffers.map(item=>[item.quality,item.priceCents,item.shippingCents])).toEqual(expect.arrayContaining([['Original',70000,10000],['Genérica',40000,10000]]));
});

test('detalle de presupuesto confirma una propuesta inequívoca sin salir de la ficha',async({page,request})=>{
  const token='e2e-agent-ingress-token-with-at-least-32-characters',externalMessageId=`e2e-detail-${unique()}`,supplierPhone=`686${String(Date.now()).slice(-7)}`;
  const supplierResponse=await page.request.post('/api/taller',{data:{action:'createSupplier',name:`Proveedor ficha ${unique()}`,phone:supplierPhone,notes:'Prueba de ficha',suppliesParts:true,suppliesAccessories:false,active:true}});
  expect(supplierResponse.ok(),await supplierResponse.text()).toBeTruthy();
  const supplier=await supplierResponse.json() as {id:number};
  const quoteResponse=await page.request.post('/api/taller',{data:{action:'createQuote',requestKey:randomUUID(),firstName:'Cliente',lastName:'Ficha',phone:'',brand:'Motorola',model:'G04',problem:'Consulta',repairType:'Pantalla',notes:'',currency:'MXN',service:'100',parts:'0',applyReview:false}});
  expect(quoteResponse.ok(),await quoteResponse.text()).toBeTruthy();
  const quote=await quoteResponse.json() as {id:number};
  const priceResponse=await page.request.post('/api/taller',{data:{action:'createSupplierPriceRequest',quoteId:quote.id,partName:'Pantalla Moto G04',supplierIds:[supplier.id]}});
  expect(priceResponse.ok(),await priceResponse.text()).toBeTruthy();
  const priceRequest=await priceResponse.json() as {id:number};
  const boot=await (await page.request.get('/api/taller')).json() as {priceRequestSuppliers:{id:number;priceRequestId:number;correlationRef:string}[]};
  const association=boot.priceRequestSuppliers.find(item=>item.priceRequestId===priceRequest.id);
  expect(association).toBeTruthy();
  const inboundResponse=await request.post('/api/agent/supplier-messages',{headers:{Authorization:`Bearer ${token}`},data:{action:'ingest',channel:'simulated',externalMessageId,sender:supplierPhone,correlationRef:association!.correlationRef,message:'Pantalla original en 650 y 50 de envío.'}});
  expect(inboundResponse.status(),await inboundResponse.text()).toBe(201);
  const inbound=await inboundResponse.json() as {messageId:number};
  const proposalResponse=await request.post('/api/agent/supplier-messages',{headers:{Authorization:`Bearer ${token}`},data:{action:'proposal',messageId:inbound.messageId,confidence:.98,reason:'Coincidencia con una sola solicitud activa.',technicalSummary:'Pantalla original con envío.',suggestedAssociationId:association!.id,offers:[{technicalSummary:'Pantalla original',price:'650',shipping:'50',quality:'Original',availability:'disponible',deliveryTime:'Mañana'}]}});
  expect(proposalResponse.ok(),await proposalResponse.text()).toBeTruthy();

  await page.goto('/?v=quotes');
  const quoteRow=page.locator('tr').filter({hasText:'Cliente Ficha'}).filter({hasText:'Motorola G04'});
  await quoteRow.getByRole('button').first().click();
  const quoteDetail=page.getByRole('dialog',{name:'Motorola G04'});
  await expect(quoteDetail).toContainText('Pantalla original con envío.');
  await quoteDetail.locator('.quote-agent-proposal').scrollIntoViewIfNeeded();
  if(process.env.SALVACEL_QA_SCREENSHOT_PATH)await page.screenshot({path:process.env.SALVACEL_QA_SCREENSHOT_PATH,fullPage:false});
  await quoteDetail.getByRole('button',{name:'Confirmar y guardar oferta(s)'}).click();
  await expect(page.getByRole('status')).toHaveText('Respuesta del proveedor confirmada y guardada para esta solicitud');
  const after=await (await page.request.get('/api/taller')).json() as {supplierInboxMessages:{id:number;status:string}[];supplierResponses:{inboundMessageId:number|null;priceCents:number|null;shippingCents:number|null}[]};
  expect(after.supplierInboxMessages.find(item=>item.id===inbound.messageId)?.status).toBe('linked');
  expect(after.supplierResponses.filter(item=>item.inboundMessageId===inbound.messageId).map(item=>[item.priceCents,item.shippingCents])).toEqual([[65000,5000]]);
});

test('las solicitudes de refacción se resumen y se abre una a la vez en el presupuesto',async({page})=>{
  const supplierResponse=await page.request.post('/api/taller',{data:{action:'createSupplier',name:`Proveedor acordeón ${unique()}`,phone:`686${String(Date.now()).slice(-7)}`,notes:'Prueba visual sintética',suppliesParts:true,suppliesAccessories:false,active:true}});
  expect(supplierResponse.ok(),await supplierResponse.text()).toBeTruthy();
  const supplier=await supplierResponse.json() as {id:number};
  const quoteResponse=await page.request.post('/api/taller',{data:{action:'createQuote',requestKey:randomUUID(),firstName:'Cliente',lastName:'Acordeón',phone:'',brand:'Samsung',model:'A54',problem:'Consulta sintética',repairType:'Pantalla',notes:'',currency:'MXN',service:'100',parts:'0',applyReview:false}});
  expect(quoteResponse.ok(),await quoteResponse.text()).toBeTruthy();
  const quote=await quoteResponse.json() as {id:number};
  for(const partName of ['Pantalla Samsung A54','Batería Samsung A54']){
    const priceResponse=await page.request.post('/api/taller',{data:{action:'createSupplierPriceRequest',quoteId:quote.id,partName,supplierIds:[supplier.id]}});
    expect(priceResponse.ok(),await priceResponse.text()).toBeTruthy();
  }

  await page.goto('/?v=quotes');
  const quoteRow=page.locator('tr').filter({hasText:'Cliente Acordeón'}).filter({hasText:'Samsung A54'});
  await quoteRow.getByRole('button').first().click();
  const quoteDetail=page.getByRole('dialog',{name:'Samsung A54'});
  const requests=quoteDetail.locator('.quote-request-card');
  await expect(requests).toHaveCount(2);
  const first=requests.nth(0).locator('.accordion__trigger');
  const second=requests.nth(1).locator('.accordion__trigger');
  await expect(first).toHaveAttribute('aria-expanded','true');
  await expect(second).toHaveAttribute('aria-expanded','false');
  await expect(first).toContainText('0/1 respuestas · 0 ofertas');
  await second.click();
  await expect(second).toHaveAttribute('aria-expanded','true');
  await expect(first).toHaveAttribute('aria-expanded','false');
  await expect(second).toContainText(/Pantalla Samsung A54|Batería Samsung A54/);
  await page.setViewportSize({width:390,height:844});
  const closeRequest=requests.nth(1).getByRole('button',{name:'Cerrar solicitud'});
  const closeRequestBounds=await closeRequest.boundingBox();
  expect(closeRequestBounds).not.toBeNull();
  expect(closeRequestBounds!.x+closeRequestBounds!.width).toBeLessThanOrEqual(390);
  if(process.env.SALVACEL_SCREENSHOT_DIR){
    const directory=process.env.SALVACEL_SCREENSHOT_DIR;
    await mkdir(directory,{recursive:true});
    for(const viewport of [{width:1440,height:1000,label:'desktop'},{width:390,height:844,label:'movil'}]){
      await page.setViewportSize({width:viewport.width,height:viewport.height});
      for(const theme of ['dark','light'] as const){
        await page.evaluate(value=>{document.documentElement.dataset.theme=value;},theme);
        await page.waitForTimeout(100);
        await page.screenshot({path:join(directory,`cotizaciones-${viewport.label}-${theme}.png`),fullPage:false});
      }
    }
  }
});

test('pedidos de proveedor se resumen y se despliegan para gestionar recepciones',async({page})=>{
  const response=await page.request.get('/api/taller');
  expect(response.ok()).toBeTruthy();
  const boot=await response.json() as {purchaseOrders:unknown[];purchaseOrderItems:unknown[];[key:string]:unknown};
  boot.purchaseOrders=[{id:910001,supplierName:'Proveedor sintético UI',status:'solicitada',createdAt:'2026-10-20T18:00:00.000Z',totalCents:70000,paidCents:0,currency:'MXN'}];
  boot.purchaseOrderItems=[{id:910001,purchaseOrderId:910001,supplierResponseId:null,partRequestId:null,repairId:null,destination:'inventory',brand:'Samsung',model:'A54',itemName:'Pantalla Samsung A54',quality:'Original',quantity:1,receivedQuantity:0,unitCostCents:70000}];
  await page.route('**/api/taller*',async route=>{
    if(route.request().method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(boot)});
    return route.continue();
  });
  await page.goto('/?v=suppliers');
  await page.getByRole('radio',{name:/Compras/}).click();
  const summary=page.getByRole('button',{name:/Proveedor sintético UI · Pedido #910001/});
  await expect(summary).toHaveAttribute('aria-expanded','true');
  await expect(summary).toContainText('Solicitada');
  await expect(summary).toContainText('Saldo');
  const receive=page.getByRole('button',{name:'Recibir'});
  await expect(receive).toBeVisible();
  await expect(page.getByText('Pago al proveedor · MXN')).toBeVisible();
  await expect(page.getByLabel('Pago al proveedor Proveedor sintético UI · MXN')).toBeVisible();
  if(process.env.SALVACEL_SCREENSHOT_DIR){
    const directory=process.env.SALVACEL_SCREENSHOT_DIR;
    await mkdir(directory,{recursive:true});
    for(const viewport of [{width:1440,height:1000,label:'desktop'},{width:390,height:844,label:'movil'}]){
      await page.setViewportSize({width:viewport.width,height:viewport.height});
      await summary.evaluate(element=>element.scrollIntoView({block:'start'}));
      for(const theme of ['dark','light'] as const){
        await page.evaluate(value=>{document.documentElement.dataset.theme=value;},theme);
        await page.waitForTimeout(100);
        await page.screenshot({path:join(directory,`compras-proveedores-${viewport.label}-${theme}.png`),fullPage:false});
      }
    }
    const dimensions=await page.evaluate(()=>({viewport:window.innerWidth,document:document.documentElement.scrollWidth}));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport+1);
  }
  await summary.click();
  await expect(summary).toHaveAttribute('aria-expanded','false');
  await expect(receive).toBeHidden();
  await summary.click();
  await expect(summary).toHaveAttribute('aria-expanded','true');
  await expect(receive).toBeVisible();
});

test('cancelar un pedido solicita motivo en un diálogo y conserva la acción explícita',async({page})=>{
  const response=await page.request.get('/api/taller');
  expect(response.ok()).toBeTruthy();
  const boot=await response.json() as {purchaseOrders:unknown[];purchaseOrderItems:unknown[];[key:string]:unknown};
  boot.purchaseOrders=[{id:910002,supplierName:'Proveedor cancelación UI',status:'solicitada',createdAt:'2026-10-20T18:00:00.000Z',totalCents:70000,paidCents:0,currency:'MXN'}];
  boot.purchaseOrderItems=[{id:910002,purchaseOrderId:910002,supplierResponseId:null,partRequestId:null,repairId:null,destination:'inventory',brand:'Samsung',model:'A54',itemName:'Pantalla Samsung A54',quality:'Original',quantity:1,receivedQuantity:0,unitCostCents:70000}];
  let mutation:Record<string,unknown>|null=null;
  await page.route('**/api/taller*',async route=>{
    if(route.request().method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(boot)});
    mutation=route.request().postDataJSON() as Record<string,unknown>;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:910002})});
  });
  await page.goto('/?v=suppliers');
  await page.getByRole('radio',{name:/Compras/}).click();
  await page.setViewportSize({width:320,height:700});
  const order=page.getByRole('button',{name:/Proveedor cancelación UI · Pedido #910002/});
  if(await order.getAttribute('aria-expanded')==='false')await order.click();
  await page.getByRole('button',{name:'Cancelar pedido',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Cancelar pedido #910002'});
  await expect(dialog).toBeVisible();
  const dialogBox=await dialog.boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(dialogBox!.x+dialogBox!.width).toBeLessThanOrEqual(320);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  if(process.env.SALVACEL_SCREENSHOT_DIR){
    const directory=process.env.SALVACEL_SCREENSHOT_DIR;
    await mkdir(directory,{recursive:true});
    await page.screenshot({path:join(directory,'cancelar-pedido-dialog-320.png'),fullPage:false});
  }
  const confirm=dialog.getByRole('button',{name:'Confirmar cancelación'});
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Motivo de cancelación').fill('El proveedor ya no tiene la pieza.');
  await expect(confirm).toBeEnabled();
  await dialog.getByRole('button',{name:'Volver al pedido'}).click();
  await expect(dialog).toBeHidden();
  expect(mutation).toBeNull();
  await page.getByRole('button',{name:'Cancelar pedido',exact:true}).click();
  await dialog.getByLabel('Motivo de cancelación').fill('El proveedor ya no tiene la pieza.');
  await confirm.click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('status')).toHaveText('Pedido cancelado; se conservó el historial.');
  expect(mutation).toMatchObject({action:'cancelPurchaseOrder',id:910002,reason:'El proveedor ya no tiene la pieza.'});
});
