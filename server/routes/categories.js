const {z,text,flag}=require('../utils/validation');
const schema=z.object({name:text(80).min(2),icon:text(10).default('◇'),color:z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#A4432B'),sort_order:z.number().int().min(0).max(9999).default(0),is_active:flag.default(1)}).strict();
module.exports=require('./catalogFactory')(require('../models/Category'),schema);
