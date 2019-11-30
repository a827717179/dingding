//  整个后台项目的入口文件
//1.express框架测试
//1-1 导入 express
let express = require('express');
//1-2 实例化当前的框架
const  app  =  new express();
//2 使用ejs模板引擎  (ejs模板引擎 默认的模板目录 views)
app.set('view engine','ejs');
//3.设置静态资源目录 (use设置中间件)
app.use(express.static('static'));
app.use('/upload',express.static('upload'));
//4.导入mongodb数据库模块
var  mongoClient = require('mongodb').MongoClient;  //用来连接数据库
var ObjectId = require('mongodb').ObjectId;        //处理数据类型
var DBurl = "mongodb://127.0.0.1:27017/myshop";   // 设置当前连接数据库的地址
//5.导入 multiparty模块 处理 post数据已经文件上传数据的接参问题
var multiparty = require('multiparty');
//6.引入fs模块进行文件操作
var  fs = require('fs');
//1-3 设置路由
app.get('/',function (req,res) {
    res.redirect('/goods/index')
});
app.get('/type/index',function (req,res) {
    //类别显示
    mongoClient.connect(DBurl,(err,db)=>{
        db.collection('type').find().toArray((err,ress)=>{
            res.render('type/index',{
                types:ress
            })
        })
    })
});
//添加
app.get('/type/add',function (req,res) {
    res.render('type/add',{})
});
//添加操作
app.post('/type/doAdd',function (req,res) {
    //执行添加，不需要页面，只需要逻辑代码即可
    // req   放的请求参数 （获取  get）  req.query  获取get传参
    //实例化
    var form = new multiparty.Form();
    //指定文件上传目录
    form.uploadDir = "upload/type";
    form.parse(req,function (err,fields,files) {
        let typename = fields.typename[0];
        let pic = files.pic[0].path;
        if(!typename){
            if(pic){
                fs.unlink(pic,function(){})
            }
            res.send("<script>alert('请填写分类名称！');history.back() </script>")
        }else if(files.pic[0].size == 0){
            if(pic){
                fs.unlink(pic,function(){})
            }
            res.send("<script>alert('请上传图片！');history.back() </script>")
        }else{
            mongoClient.connect(DBurl,function (e,db) {
                db.collection("type").insertOne({
                    typename,
                    pic
                },function (er,re) {
                    if(re){
                        res.send("<script>alert('添加成功！');location.href = '/type/index' </script>");
                    }else{
                        if(pic){
                            fs.unlink(pic,function(){})
                        }
                        res.send("<script>alert('添加失败！');history.back()  </script>")
                    }
                })
            })
        }
    });
});
//删除
app.get('/type/delType',function (req,res) {
    let _id = ObjectId(req.query.id);
    let pic = req.query.pic;
    mongoClient.connect(DBurl,function (err,db) {
        db.collection("type").removeOne({_id},function (errr,ress) {
            if(ress){
                if(pic){
                    fs.unlink(pic,function () {})
                }
                res.send("<script>alert('删除成功！');location.href = '/type/index'</script>")
            }else {
                res.send("<script>alert('删除失败！');history.back() </script>")
            }
        })
    });
});
//修改跳转
app.get('/type/edit',function (req,res) {
    let _id = ObjectId(req.query.id);
    mongoClient.connect(DBurl,function (err,db) {
       db.collection("type").findOne({_id},function (er,ress) {
           res.render('type/edit',{
                types:ress
           })
       })
    });
});
//修改
app.post('/type/doEdit',function (req,res) {
    var form = new multiparty.Form();
    form.uploadDir = "upload/type";
    form.parse(req,function (err,fields,files) {
        console.log(fields);
        let typename = fields.typename[0];
        let _id = ObjectId(fields.id[0]);
        let oldPic = fields.oldPic[0];
        let pic = files.pic[0].path;
        if(files.pic[0].size == 0){
            mongoClient.connect(DBurl,function (er,db) {
                db.collection("type").updateOne({_id},{$set:{typename}},function (errr,reess) {
                    if(pic){
                        fs.unlink(pic,function(){})
                    }
                    if(reess){
                        res.send("<script>alert('修改成功！');location.href='/type/index'  </script>")
                    }else{
                        //删除失败
                        res.send("<script>alert('修改失败！');history.back()  </script>")
                    }
                })
            })
        }else{
            mongoClient.connect(DBurl,function (er,db) {
                db.collection("type").updateOne({_id},{$set:{
                        typename,
                        pic
                    }},function (errrr,resss) {
                    if(resss){
                        //修改成功了，删除原来的上传图片
                        if(oldPic){
                            fs.unlink(oldPic,function(){})
                        }
                        res.send("<script>alert('修改成功！');location.href='/type/index'  </script>")
                    }else{
                        //删除新的上传图片
                        if(pic){
                            fs.unlink(pic,function(){})
                        }
                        res.send("<script>alert('修改失败！');history.back()  </script>")
                    }
                })
            })
        }
    })
});
//商品============================
app.get('/goods/index',function (req,res) {
    //商品显示
    mongoClient.connect(DBurl,(err,db)=>{
        db.collection('foods').find().toArray((err,ress)=>{
            //  ress 商品数组里面 只有 类别id ，现在需要每个商品的类别名称
            ress.forEach((item,index)=>{
                //此时类别id 在item内保存
                db.collection('type').findOne({_id:ObjectId(item.typeid)},function(errss,resss){
                    ress[index]['typename'] = resss.typename;
                })
            });
            setTimeout(()=>{
                //获取数据之后，将所有的类别渲染到type/index模板中
                res.render("goods/index",{
                    goods:ress
                })
            },20)
        })
    })
});
//添加商品页
app.get('/goods/add',function (req,res) {
    // 获取所有的商品类别，渲染到商品添加页面
    mongoClient.connect(DBurl,function(err,db){
        //操作数据表
        db.collection('type').find().toArray(function(errs,ress){
            //获取数据之后，将所有的类别渲染到type/index模板中
            res.render('goods/add',{
                types:ress
            })
        })
    })
});
//添加商品
app.post('/goods/doAdd',function (req,res) {
   let form = new multiparty.Form();
   form.uploadDir = "upload/goods";
   form.parse(req,function (err,fields,files) {
       let goodsname = fields.goodsname[0];  //商品名称
       let typeid = fields.typeid[0];  //类别id
       let price = fields.price[0];  //商品价格
       let num = fields.num[0];  //商品数量
       let status = fields.status[0];  //商品状态
       let desc = fields.desc[0];  //商品描述
       let pic = files.pic[0].path;
       mongoClient.connect(DBurl,function (err,db) {
            db.collection('foods').insertOne({
                goodsname,typeid,price,num,status,desc,pic
            },function (errr,ress) {
                if(ress){
                    //添加成功
                    //  是否有图片上传
                    if(files.pic[0].size == 0){
                        fs.unlink(pic,function(){})
                    }
                    //数据库是否添加成功
                    res.send("<script>alert('商品添加成功！');location.href='/goods/index'  </script>")
                }else{
                    //添加失败
                    //有上传图图片，但是呢，数据库添加失败，此时需要把上传好的图片也要删除掉
                    if(pic){
                        fs.unlink(pic,function(){})
                    }
                    res.send("<script>alert('商品添加失败！');history.back()  </script>")
                }
            })
       })
   })
});
//删除商品
app.get('/goods/delType',function (req,res) {
    let _id = ObjectId(req.query.id);
    let pic = req.query.pic;
    mongoClient.connect(DBurl,function (err,db) {
        db.collection("foods").removeOne({_id}, function (errr, ress) {
            if (ress) {
                if (pic) {
                    fs.unlink(pic, function () {
                    })
                }
                res.send("<script>alert('删除成功！');location.href = '/goods/index'</script>")
            } else {
                res.send("<script>alert('删除失败！');history.back() </script>")
            }
        })
    })
});
//修改商品页
app.get('/goods/edit',function (req,res) {
    let _id = ObjectId(req.query.id);
    mongoClient.connect(DBurl,function(err,db){
        //操作数据表  （一维的）
        db.collection('foods').findOne({_id},function(errs,ress){
            //获取所有的types
            db.collection('type').find().toArray(function(errss,resss){
                //获取数据之后，将所有的类别渲染到type/index模板中
                res.render("goods/edit",{
                    goods:ress, //商品信息
                    types:resss  //类别
                })
            })
        })
    })
});
//修改商品
app.post('/goods/doEdit',function (req,res) {
    let form = new multiparty.Form();
    form.uploadDir = 'upload/goods';
    form.parse(req,function (err, fields, files) {
        let  goodsname = fields.goodsname[0];  //商品名称
        let  typeid = fields.typeid[0];  //类别id
        let  price = fields.price[0];  //商品价格
        let  num = fields.num[0];  //商品数量
        let  status = fields.status[0];  //商品状态
        let  desc = fields.desc[0];  //商品描述
        let  oldPic = fields.oldPic[0];  // 获取原来的图片信息
        let  _id = ObjectId(fields.id[0]);  // 获取类别id

        let  pic = files.pic[0].path;  //新的图片信息
        //判断当前是否有新的上传图片
        if(files.pic[0].size == 0){
            //没有新的上传图片 ，不用去处理原来的图片，只需要处理类别名称即可
            mongoClient.connect(DBurl,function(err,db){
                db.collection('foods').updateOne({_id},{$set:{
                        goodsname,typeid,price,num,status,desc
                    }},function(errs,ress){
                    if(pic){
                        fs.unlink(pic,function(){})
                    }
                    if(ress){
                        res.send("<script>alert('商品修改成功！');location.href='/goods/index'  </script>")
                    }else{
                        //删除失败
                        res.send("<script>alert('商品修改失败！');history.back()  </script>")
                    }
                })
            })
        }else{
            //有新的上传图片
            mongoClient.connect(DBurl,function(err,db){
                db.collection('foods').updateOne({_id},{$set:{
                        goodsname,typeid,price,num,status,desc,pic
                    }},function(errs,ress){
                    if(ress){
                        //修改成功了，删除原来的上传图片
                        if(oldPic){
                            fs.unlink(oldPic,function(){})
                        }
                        res.send("<script>alert('商品修改成功！');location.href='/goods/index'  </script>")
                    }else{
                        //删除新的上传图片
                        if(pic){
                            fs.unlink(pic,function(){})
                        }
                        res.send("<script>alert('商品修改失败！');history.back()  </script>")
                    }
                })
            })
        }
    })
});
//购物车页
app.get('/cart/index',function (req,res) {
    mongoClient.connect(DBurl,function (err,db) {
            db.collection('cart').find().toArray(function(errs,ress){
            ress.forEach((item,index) => {
                db.collection('foods').findOne({
                    _id:ObjectId(item.goodsid)
                },function (e,r) {
                    ress[index]['goodsname'] = r.goodsname;
                    ress[index]['goodspic'] = r.pic;
                    ress[index]['price']= r.price;
                })
            })
            setTimeout(() => {
                res.render('cart/index',{
                    carts:ress
                })
            },100)

        })
        //操作数据表
        // db.collection('cart').find().toArray(function(errs,ress){
        //     //  goodsid  通过id去goods表里去获取商品名称，商品图片。商品价格
        //     ress.forEach((item,index)=>{
        //         db.collection('goods').findOne({_id:ObjectId(item.goodsid)},function(e,r){
        //             ress[index]['goodsname'] = r.goodsname;
        //             ress[index]['goodspic'] = r.pic;
        //             ress[index]['price'] = r.price
        //         })
        //     })
        //     //获取数据之后，将所有的类别渲染到type/index模板中
        //     setTimeout(()=>{
        //         res.render('cart/index',{
        //             carts:ress
        //         })
        //     },20)
        // })
    })
});
//=======================订单模块===============

app.get('/order/index',function(req,res){

    //链接数据库，获取订单信息
    mongoClient.connect(DBurl,function(err,db){

        db.collection('order').find().toArray(function(e,r){
            // console.log(r)
            res.render('order/index',{
                orders:r
            })
        })

    })
})


app.get('/order/edit',function(req,res){
    // 获取id
    let  _id =  ObjectId(req.query.id)

    //链接数据库，获取订单信息
    mongoClient.connect(DBurl,function(err,db){

        db.collection('order').findOne({_id},function(e,r){
            res.render('order/edit',{
                order:r
            })
        })

    })

});
app.get('/order/doEdit',function(req,res){
    // 获取参数
    let  _id =  ObjectId(req.query.id);
    let  status = req.query.status;

    // console.log(_id,status)
    mongoClient.connect(DBurl,function(err,db){

        db.collection('order').updateOne({_id},{$set:{status}},function(e,r){
            if(r){
                res.send("<script>alert('订单状态修改成功！');location.href='/order/index'  </script>")
            }else{
                res.send("<script>alert('订单状态修改失败！');history.back()  </script>")
            }
        })

    })
})
//登录
app.get('/login',function (req,res) {
    res.render('login',{})
});
//1-4 设置端口
app.listen('3000','127.0.0.1');

