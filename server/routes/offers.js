const {z,text,id,flag,fail}=require('../utils/validation');
const Product=require('../models/Product');
const schema=z.object({product_id:id,label:text(100).min(2),discount_pct:z.number().int().min(1).max(95),valid_until:z.string().datetime({offset:true}).nullable().default(null),is_active:flag.default(1)}).strict();
const router=require('./catalogFactory')(require('../models/Offer'),schema,{fields:['label'],validate:async data=>{if(data.product_id&&!await Product.exists({id:data.product_id,is_active:1}))fail(400,'Choose an active product.');if(data.valid_until&&new Date(data.valid_until)<=new Date())fail(400,'Choose a future expiry.');},decorate:async items=>{const products=await Product.find({id:{$in:items.map(o=>o.product_id)}}).lean();return items.map(o=>({...o,product_name:products.find(p=>p.id===o.product_id)?.name||'Archived product'}));}});
module.exports=router;
