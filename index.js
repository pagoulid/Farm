const axios = require('axios') ;
const fs = require('fs');
const http = require('http');
const url = require('url');

let landingTemplate = fs.readFileSync('./page/landing.html','utf-8')
let productTemplate = fs.readFileSync('./page/product-template.html','utf-8')

function landingHandler(res,template='<h1>Init project</h1>'){
    res.writeHead(200,{'Content-type':'text/html'})
    console.log('Page loaded...')
    res.end(template)
}
function apiHandler(res,data=''){
    res.writeHead(200,{'Content-type':'application/json'})
    res.end(data);
}
function errorHandler(res){

    res.writeHead(404,{'Content-type':'text/html'})
    res.end('<h1>404 page not found</h1>')

}

function templateDataRepl(template,data){
        //console.log(data)
       for(key in data){
        template = template.replace(key,data[key])
       }
    return template
}// keywords {'<%NAME%>':...}

async function getProducts(){
    let pres=await axios.get('http://localhost:3000/api')
    return pres
}

function landing(res,template,products){
    let ptemplate = products.map((product)=>templateDataRepl(productTemplate,{'{%NAME%}':product.productName,'{%IMG%}':product.image,'{%FROM%}':product.from,'{%NUTRIENTS%}':product.nutrients,'{%QUANTITY%}':product.quantity+' '+product.image,'{%PRICE%}':product.price}))
    template=templateDataRepl(template,{'{%PRODUCTS%}':ptemplate.join('')})
    landingHandler(res,template)
   
}

function update_products(file,res,products,template,handler,op){ // callback function

    fs.readFile(file,'utf-8',(err,data)=>{
        let content = JSON.stringify(products,null,4)
        let msg = {'add':'New product added','remove':'Product  removed'}

        fs.writeFile(file,content,'utf-8',()=>{
            console.log(msg[op])
            handler(res,template,products)
        })

    })

}

function add_product(res,products,product,template,handler,callback){
    let file = './data/products.json'
    products.push(product)
    callback(file,res,products,template,handler,'add')

}


function remove_product(res,products,product,template,handler,callback){
    let file = './data/products.json'

    let updated_products = products.filter((p)=>{
        return p.productName!=product.productName
    })

    callback(file,res,updated_products,template,handler,'remove')
    
}

function has_product(products,product){
    let res = products.reduce((acc,curr)=>{
        let val = (curr.productName==product.productName)?1:0;
        return acc + val
    },0)
    return res
}

const server = http.createServer((req,res)=>{

    let path = req.url
    //console.log(req.method,req.url)
    //console.log('-----------------------------------')
    switch(path){
        case '/favicon.ico':
        break
        case '/':
            let fetchData = getProducts()
            fetchData.then((pres)=>{
                let products=pres.data

                if(req.method=='GET'){ landing(res,landingTemplate,products)}
                if(req.method=='POST'){
                    let body = '';
                    req.on('data',chunk=>{
                        body+=chunk
                    })
                    req.on('end',()=>{
                        const { query }= url.parse('?'+body,true)
                        let submit = query['submit']
                        delete query['submit']
                        if(submit=='add' && (!has_product(products,query))){
                            add_product(res,products,query,landingTemplate,landing,update_products)
                        }
                        else if(submit=='remove' && has_product(products,query)){
                           remove_product(res,products,query,landingTemplate,landing,update_products)
                        }
                        else{
                            landing(res,landingTemplate,products) 
                        }
                        
                    })
                }
                   
            })

        break
        case '/api':
            if(req.method=='GET'){
                fs.readFile('./data/products.json','utf-8',(err,data)=>{
                    apiHandler(res,data)  
                })
            }
        break
        default:
            errorHandler(res)
        break

    }


})

server.listen(3000,'127.0.0.1',()=>{console.log('Server listening on port 3000...')})