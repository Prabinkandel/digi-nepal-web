const Offer=require('../models/Offer');
const Category=require('../models/Category');
async function decorate(items){
  const [offers,categories]=await Promise.all([Offer.find({is_active:1,product_id:{$in:items.map(p=>p.id)}}).lean(),Category.find().lean()]);
  const catMap=new Map(categories.map(c=>[c.id,c.name]));
  return items.map(p=>{
    const active=offers.filter(o=>o.product_id===p.id && (!o.valid_until || new Date(o.valid_until)>new Date()));
    const best=active.sort((a,b)=>b.discount_pct-a.discount_pct)[0];
    const sale=best?Math.round(p.price*(1-best.discount_pct/100)*100)/100:p.price;
    return {...p,category_name:catMap.get(p.category_id)||'Digital tools',base_price:p.price,price:sale,offer_label:best?.label||'',original_price:sale<p.price?p.price:p.original_price};
  });
}
module.exports={decorate};
