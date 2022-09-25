const {query}=require('./asyncDb.js');
const koa=require('koa');
const url=require('url');
const pathlib=require('path');
const staticCache=require('koa-static-cache')
const axios=require('axios');
const sha1=require('sha1');
const BodyPaser=require('koa-better-body');
const convert = require('koa-convert');
const koaRouter=require('koa-router');

let server=new koa();
let r1=koaRouter();

server.use(convert(BodyPaser({
  uploadDir: './upload', //指定上传路径
  keepExtensions: 'true' //文件是否需要扩展名
})));



let APPID='wx80a8bc5a25f45bfb';
let SECRET='2e5fb0cf5999b132d0f4f63bb6243c06';

server.use(r1.routes());

server.use(staticCache(__dirname+'/pyg',{prefix:'/pyg'}));
server.use(staticCache(__dirname+'/full',{prefix:'/full'}));

let result={};

r1.get('/home/swiperdata',async ctx=>{
	result={};
	result.message=[];
	result.meta={};
	await query('select * from swiper').then(res=>{
		result.message=res;
		result.meta={"msg":"获取成功","status":200}
		ctx.body=result;
	},rej=>{
		result.message="null";
		result.meta={"msg":"获取失败","status":404}
		ctx.body=result;
	});
});

r1.get('/home/catitems',async ctx=>{
	result={};
	result.message=[];
	result.meta={};
	await query('select * from navigate').then(res=>{
		result.message=res;
		result.meta={"msg":"获取成功","status":200}	
		ctx.body=result;
	},rej=>{
		result.message="null";
		result.meta={"msg":"获取失败","status":404}
		ctx.body=result;
	});
	
	
});

r1.get('/home/floordata',async ctx=>{
	result={};
	result.message=[];
	result.meta={};
	await query('select name,image_src from floor_title').then(async res=>{
		let res2 = await query('select name,image_src,image_width,open_type,navigator_url,parent_id from product_list');
		for(let i=0;i<res.length;i++){
			result.message[i]={}
			result.message[i].product_list=[];
			result.message[i].floor_title=res[i];
			let num=0;
			for(let j=0;j<res2.length;j++){
				if(num<=4){
					result.message[i].product_list[num]={};
				}
				if(res2[j].parent_id==i+1){
					result.message[i].product_list[num].name=res2[j].name;
					result.message[i].product_list[num].image_src=res2[j].image_src;
					result.message[i].product_list[num].image_width=res2[j].image_width;
					result.message[i].product_list[num].open_type=res2[j].open_type;
					result.message[i].product_list[num].navigator_url=res2[j].navigator_url;
					num++;
				}
				
			}
		}
		result.meta={"msg":"获取成功","status":200}
		ctx.body=result;
		result={};
	},rej=>{
		result.message="null";
		result.meta={"msg":"获取失败","status":404}
		ctx.body=result;
	});
});

r1.get('/categories',async ctx=>{
	result={};
	result.message=[];
	result.meta={};
	await query('select * from cate where cat_level=0').then(async res=>{
		for(let i=0;i<res.length;i++){
			result.message[i]=res[i];
		}
		for(let i=0;i<res.length;i++){
			await query(`select * from cate where cat_level=1 and cat_pid=${res[i].cat_id}`).then(async res2=>{
				result.message[i].children=[];
				for(let j=0;j<res2.length;j++){
					result.message[i].children[j]=res2[j];
					result.message[i].children[j].children=[];
					await query(`select * from cate where cat_level=2 and cat_pid=${res2[j].cat_id}`).then(res3=>{
						for(let k=0;k<res3.length;k++){
							result.message[i].children[j].children[k]=res3[k];
						}
					});
				}
			});
		}
		result.meta={"msg":"获取成功",'status':200}
		ctx.body=result;
	},rej=>{
		result.message="null";
		result.meta={"msg":'获取失败',"status":404}
		ctx.body=result;
	});
});

r1.get('/goods/search',async ctx=>{
	result={};
	result.message={};
	result.meta={};
	let params={
		query:"",
		cid:"",
		pagenum:1,
		pagesize:10
	};
	params.query=ctx.request.query.query ? ctx.request.query.query:' ';
	params.cid=ctx.request.query.cid ? ctx.request.query.cid : 5;
	params.pagenum=ctx.request.query.pagenum ? ctx.request.query.pagenum : 1;
	params.pagesize=ctx.request.query.pagesize ? ctx.request.query.pagesize : 10;
	
	let res=await query('select count(*) from goods where cat_id=?',[params.cid]);
	result.message.total=res[0]['count(*)'];
	result.message.pagenum=params.pagenum;
	await query(`select goods_id,cat_id,goods_name,goods_price,goods_number,goods_weight,goods_big_logo,goods_small_logo,add_time,upd_time,hot_mumber,is_promote,cat_one_id,cat_two_id,cat_three_id from goods where cat_id=${params.cid} limit ${(params.pagenum-1)*params.pagesize},${params.pagesize}`).then(res=>{
		result.message.goods=res;
	})
	
	ctx.body=result;
});

r1.get('/goods/detail',async ctx=>{
	result={};
	result.message={}
	result.meta={};
	if(!ctx.request.query.goods_id){
		result.message="null";
		result.meta={"msg":'缺少参数',"status":404}
		ctx.body=result;
	}
	await query('select * from goods where goods_id=?',[ctx.request.query.goods_id]).then(async res=>{
		if(!res){
			result.message="null";
			result.meta={"msg":'无此商品！',"status":404}
			ctx.body=result;
		}
		let res2=await query('select * from goods_pic where goods_id=?',[ctx.request.query.goods_id]);
		result.message=res[0];
		result.message.pics=res2;
		result.meta={"msg":'获取失败！',"status":404};
	},rej=>{
		result.message="null";
		result.meta={"msg":'获取失败！',"status":404}
		ctx.body=result;
	});
	
	ctx.body=result;
});

r1.get('/users/wxlogin',async ctx=>{
	result={};
	if(!ctx.request.query.code){
		result.meta={"msg":"缺少参数","status":404};
	}
	result.message={};
	result.meta={};
	let params={
		js_code:""
	};
	params.js_code=ctx.request.query.code;
	params.rawData=ctx.request.query.rawData;
	params.signature=ctx.request.query.signature;
	params.userInfo=JSON.parse(ctx.request.query.userInfo);
	let openid;
	
	await axios(`https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${SECRET}&js_code=${ctx.request.query.code}&grant_type=authorization_code`).then(async res=>{
		openid=res.data.openid;
		console.log(res.data);
		result.message.token=openid;
		if(params.signature==sha1(params.rawData+res.data.session_key)){
			let r = await query('select * from user where open_id=?',[res.data.openid]);
			if(!r.length){
				let max=await query('select max(user_id) max from user');
				await query('insert into user(user_id,open_id,nickName,city,province,country,avatarUrl) values(?,?,?,?,?,?,?)',[max[0].max+1,res.data.openid,params.userInfo.nickName,params.userInfo.city,params.userInfo.province,params.userInfo.country,params.userInfo.avatarUrl]);
			}
			
		}else{
			result.message=null;
			result.meta={"msg":"获取失败","status":404}
		}
		 ctx.body=result;
	},rej=>{
		console.log(rej);
	});
	
});

r1.post('/my/orders/create',async ctx=>{
	let userid=(await query('select user_id from user where open_id=?',[ctx.request.header.authorization]))[0].user_id;
	let ordernumber='H'+new Date().getTime();
	let issend= 0;
	let order_price=ctx.request.fields.order_price;
	let consignee_addr=ctx.request.fields.consignee_addr;
	let pay_status=ctx.request.fields.pay_status;
	let create_time=new Date().getTime();
	let update_time=new Date().getTime();
	let goods=ctx.request.fields.goods;
	console.log(goods);
	let order_id=(await query('select max(order_id) max from order_list'));
	order_id=order_id[0].max+1;
	await query('insert into order_list(order_id,user_id,order_number,order_price,is_send,consignee_addr,pay_status,create_time,update_time) values(?,?,?,?,?,?,?,?,?)',[order_id,userid,ordernumber,order_price,issend,consignee_addr,pay_status,create_time,update_time]);
	for(let i =0;i<goods.length;i++){
		let res5=await query('select goods_id,goods_name,goods_small_logo from goods where goods_id=?',[ctx.request.fields.goods[i].goods_id]);
				await query(`update goods set goods_number=goods_number-${ctx.request.fields.goods[i].goods_number} where goods_id=${ctx.request.fields.goods[i].goods_id}`)
		let arr=[userid,order_id,res5[0].goods_id,goods[i].goods_price,goods[i].goods_number,goods[i].goods_number*goods[i].goods_price,res5[0].goods_name,res5[0].goods_small_logo];
		await query('insert into order_goods(user_id,order_id,goods_id,goods_price,goods_number,goods_total_price,goods_name,goods_small_logo) values(?,?,?,?,?,?,?,?)',arr);
		
	}
	result.meta={"msg":"创建成功","status":200}; 
	ctx.body=result;
});


r1.post('/my/orders/all',async ctx=>{
	console.log(ctx.request.fields);
		result.message={};
		result.meta={};
		let type=ctx.request.fields.type;
		let token=ctx.request.header.authorization;
		let userid=(await query('select user_id from user where open_id=?',[ctx.request.header.authorization]))[0].user_id;
		if(type==1){
			let sql='select id,b.pay_status,a.user_id,a.order_id,goods_id,goods_price,goods_number,goods_total_price,goods_name,goods_small_logo from order_goods a,order_list b where a.user_id=? and a.order_id=b.order_id;'
			await query(sql,[userid]).then(res=>{
				result.message.orders=res;
			});
		}
		if(type==2){
			let sql='select id,b.pay_status,a.user_id,a.order_id,goods_id,goods_price,goods_number,goods_total_price,goods_name,goods_small_logo from order_goods a,order_list b where a.user_id=? and a.order_id=b.order_id and pay_status=0;'
			await query(sql,[userid]).then(res=>{
				result.message.orders=res;
			});
		}
		if(type==3){
			let sql='select id,b.pay_status,a.user_id,a.order_id,goods_id,goods_price,goods_number,goods_total_price,goods_name,goods_small_logo from order_goods a,order_list b where a.user_id=? and a.order_id=b.order_id and pay_status=1 and b.is_send=0;'
			await query(sql,[userid]).then(res=>{
				result.message.orders=res;
			});
		}
		if(type==4){
			result.message.orders=[];
		}
		
		ctx.body=result;
	});

r1.get('/goods/qsearch',async ctx=>{
	let querys=ctx.request.query.query;
	console.log(querys);
	let res=await query(`select goods_id,goods_name,goods_price,goods_small_logo from goods where goods_name like '%${querys}%' `);
	result.message=res;
	ctx.body=result;
});

server.listen(1024);


