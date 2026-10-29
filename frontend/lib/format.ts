export const methods:Record<string,string>={
  efectivo:'Efectivo',
  transferencia:'Transferencia',
  tarjeta:'Tarjeta',
  otro:'Otro',
};

export const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
export const paymentLabel=(kind:string)=>kind==='anticipo'?'Anticipo':kind==='ajuste_historico'?'Liquidación histórica':'Pago';
export const methodLabel=(method:string)=>methods[method]||method;
export const partStatusLabel=(status:string)=>({por_verificar:'Por verificar',solicitada:'Solicitada',disponible:'Disponible',no_disponible:'No disponible'}[status]||status);
export const availabilityLabel=(status:string)=>({por_confirmar:'Por confirmar',disponible:'Disponible',agotada:'Agotada',bajo_pedido:'Bajo pedido'}[status]||status);
