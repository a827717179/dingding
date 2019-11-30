//给前台返回数据的文件
let  express =  require('express');
//实例化当前的框架
const  app  =  new  express();

var  mongoClient = require('mongodb').MongoClient;  //用来连接数据库
var ObjectId = require('mongodb').ObjectId;        //处理数据类型
var DBurl = "mongodb://127.0.0.1:27017/myshop";   // 设置当前连接数据库的地址
//列表type接口
app.get('/apiGetTypes',function (req,res) {
    mongoClient.connect(DBurl,function (err,db) {
        db.collection('type').find().toArray(function (errr,ress) {
            res.writeHead(200,{"Content-Type":"application/json"});
            res.write(JSON.stringify(ress));
            res.end()
        })
    })
});
//newgoods接口
app.get('/apigetNewGoods',function (req,res) {

    let where = req.query || [];
    if (req.query.tag==1){
        where.status = JSON.parse(where.status);
        delete where.tag
    }
    mongoClient.connect(DBurl,function (err,db) {
        db.collection('foods').find(where).toArray(function (errr,ress) {
            res.writeHead(200,{"Content-Type":"application/json"});
            res.write(JSON.stringify(ress));
            res.end()
        })
    })
});
//获取商品详情接口
app.get('/apiGetGoods',function (req,res) {
    let _id = ObjectId(req.query.id);
    mongoClient.connect(DBurl,function (err,db) {
        db.collection('foods').findOne({_id},function (err,ress) {
            res.writeHead(200,{"Content-Type":"application/json"});
            res.write(JSON.stringify(ress));
            res.end()
        })
    })
});
//添加购物车
app.get('/apiAddcart',function (req,res) {
    let goodsid = req.query.goodsid;
    let nickName = req.query.nickName;
    let num = 1;
    let checked = "0"; // 给当前状态加引号，防止后期作为条件时出现问题
    mongoClient.connect(DBurl,function (err,db) {
        db.collection('cart').findOne({
            goodsid,
            nickName
        },function (errs,ress) {
            //判断当前ress是否有值  （没有值null）
            if(ress){
                // 已经买过当前商品，做修改数量  获取原来购买的数量，然后进行+1
                let  newNum =  ++ress.num;
                db.collection('cart').updateOne({
                    goodsid,
                    nickName
                },{
                    $set:{
                        num:newNum
                    }
                },function(e,r){
                    res.writeHead(200,{"Content-Type":"application/json"});
                    res.write(JSON.stringify(r));
                    res.end()
                })
            }else{
                //没有买过，做增加操作
                db.collection('cart').insertOne({
                    goodsid,
                    nickName,
                    num,
                    checked
                },function(e,r){
                    res.writeHead(200,{"Content-Type":"application/json"})
                    res.write(JSON.stringify(r))
                    res.end()
                })
            }
        })
    })
});
//获取购物车
app.get('/apiGetCart',function (req,res) {
    let  nickName = req.query.nickName;  // 用户名
    console.log(nickName);
    mongoClient.connect(DBurl,function(err,db){
        db.collection('cart').find({nickName}).toArray(function(errs,ress){
            ress.forEach((item,index)=>{
                db.collection('foods').findOne({_id:ObjectId(item.goodsid)},function(e,r){
                    ress[index]['goodsname'] = r.goodsname;
                    ress[index]['goodspic'] = r.pic;
                    ress[index]['price'] = r.price
                })
            });
            //获取数据之后，将所有的类别渲染到type/index模板中
            setTimeout(()=>{
                console.log(ress);
                res.writeHead(200,{"Content-Type":"application/json"});
                res.write(JSON.stringify(ress));
                res.end()
            },30)
        })
    })
});
app.get('/wxapiChangeChecked',function(req,res){
    let  _id = ObjectId(req.query.id);  //需要处理id
    let checked = req.query.checked;
    // console.log(id,checked)
    mongoClient.connect(DBurl,function(err,db){
        db.collection('cart').updateOne({_id:_id},{$set:{checked}},function(e,r){
            res.writeHead(200,{"Content-Type":"application/json"});
            res.write(JSON.stringify(r));
            res.end()
        })
    })
});
//处理所有的购物车商品状态
app.get('/wxapiChangeAllChecked',function(req,res){
    let checked = req.query.checked;
    let nickName = req.query.nickName;
    // console.log(id,checked)
    mongoClient.connect(DBurl,function(err,db){
        db.collection('cart').updateMany({nickName},{$set:{checked}},function(e,r){
            res.writeHead(200,{"Content-Type":"application/json"});
            res.write(JSON.stringify(r));
            res.end()
        })

    })
})
//数量更爱操作
app.get('/wxapiNumDesc',function(req,res){
    let  _id =  ObjectId(req.query.id)
    let  num = req.query.num;
    mongoClient.connect(DBurl,function(err,db){
        db.collection('cart').updateOne({ _id},{$set:{num}},function(e,r){
            res.writeHead(200,{"Content-Type":"application/json"})
            res.write(JSON.stringify(r))
            res.end()
        })
    })
})
//生成订单
app.get('/wxapiOrder',function(req,res){
    console.log(2222222)

    let  username = req.query.username;
    let  phone = req.query.phone;
    let  address = req.query.address;
    let  total = req.query.total;
    let  user = req.query.nickName;
    let  status = 1;  //新订单

    mongoClient.connect(DBurl,function(err,db){

        db.collection('order').insertOne({
            username,phone,address,total,user,status
        },function(errs,ress){
            //处理结果
            //库存（判断库存的问题，可以在购车进行处理，也可以在订单处理）忽略
            //在下单成功之后，需要将商品的信息插入到订单详情（忽略）
            //处理商品库存，下单成功之后，减少问题 (购买商品id  ， 原来的数量，以及要买的数量)
            db.collection('cart').find({nickName:user,checked:"1"}).toArray(function(e,r){
                // console.log(r)
                //r就是要购买的商品 【】
                r.forEach((item,index)=>{
                    // item  就是一维的商品信息  【商品的id】
                    db.collection('foods').findOne({_id:ObjectId(item.goodsid)},function(es,rs){
                        //rs里面就是最原本的商品信息 【存了原来的库存】
                        let  oldNum =  rs.num; //原来的库存
                        let  num = item.num;  // 购买的数量
                        db.collection('foods').updateOne({_id:ObjectId(item.goodsid)},{
                            $set:{
                                num:oldNum -num
                            }
                        },function(ess,rss){
                            // 更改好了库存
                            //删除购物车内的信息
                            db.collection('cart').removeMany({nickName:user,checked:"1"},function(esss,rsss){
                                res.writeHead(200,{"Content-Type":"application/json"})

                                res.write(JSON.stringify(rsss))

                                res.end()
                            })
                        })
                    })

                })
            })
            //下单成功后，删除购物车内相应的商品
        })
    })


})

app.get('/wxpaiGetOrders',function(req,res){
    mongoClient.connect(DBurl,function(err,db){

        db.collection('order').find({user:req.query.nickName}).toArray(function(e,r){
            res.writeHead(200,{"Content-Type":"application/json"})

            res.write(JSON.stringify(r))

            res.end()
        })

    })

})

app.get('/wxapiChangeOrderStatus',function(req,res){
    let  _id = ObjectId(req.query.id)

    mongoClient.connect(DBurl,function(err,db){

        db.collection('order').updateOne({_id},{$set:{
                status:"3"
            }},function (e,r) {
            res.writeHead(200,{"Content-Type":"application/json"})

            res.write(JSON.stringify(r))

            res.end()
        })

    })

})


app.listen('3001',"127.0.0.1");