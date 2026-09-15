const {z,text,money,id,flag,image,fail}=require('../utils/validation');
const Product=require('../models/Product');
const Category=require('../models/Category');
const {decorate}=require('../utils/catalog');
const schema=z.object({name:text(120).min(2),category_id:id,price:money,original_price:money.nullable().default(null),badge:text(30).default(''),image_url:image.default(''),description:text(4000).default(''),features:z.array(text(250)).max(30).default([]),sort_order:z.number().int().min(0).max(9999).default(0),is_active:flag.default(1)}).strict();
module.exports=require('./catalogFactory')(Product,schema,{decorate,validate:async data=>{if(data.category_id&&!await Category.exists({id:data.category_id,is_active:1}))fail(400,'Choose an active category.');}});
