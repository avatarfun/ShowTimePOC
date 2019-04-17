<%--$Id$ --%>
<%@page import="com.adventnet.wms.api.WmsApi"%>
<%@ taglib uri = "http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt"%>
<%@ taglib uri="http://jakarta.apache.org/struts/tags-html" prefix="html" %>
<%@page import="org.json.JSONArray"%>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>

<%
 String onlineAgentsZuidsResp = request.getAttribute("onlineAgentsZuids")+""; 
%>
<!DOCTYPE html>
<html>
	<head>
		<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
		<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
		<script src="https://code.jquery.com/jquery-3.3.1.min.js"></script>

		<script src="//<%=WmsApi.getJSURL("wmsliteapi.js")%>"></script>
		<script src="//<%=WmsApi.getJSURL("pex.js")%>"></script>
		<script type="text/javascript" >window.ZohoHCAsapSettings = {
			    homePageSettings: {
			        widgets: [
			            {
			                type: "CUSTOM_WIDGETS",
			                title: "Model Custom Widget",
			                content:
			                `<div class="">
						<div>
							Available Active Agents : <span id="onlineAgentsStatus"><%=onlineAgentsZuidsResp%></span>
							<button id="refreshAgentStaus" onClick="POC_Vis.getAvaliableAgents()">Re-check</button>
						</div>
						<br>
						<div>
							Name : <input type="text" id="anonName" placeholder="Enter your name"/> 
							<button id="callNow" onClick="POC_Vis.click2Call()">Call Now</button>
						</div>
						<br>
						<div>
							<div id="callStausDiv">
								Call Status Logs: <span style="color:green"><b id="callStaus" ></b></span> <button onClick="$('#callStaus').text('');">Clear</button>	
							</div>
						</div>
					</div>`
			            }
			        ]
			    }
			};
</script>
		<script type="text/javascript" > window.ZohoHCAsap=window.ZohoHCAsap||function(a,b){ZohoHCAsap[a]=b;};(function(){var d=document; var s=d.createElement("script");s.type="text/javascript";s.defer=true; s.src="https://rajesh-zt35.tsi.zohocorpin.com:8444/portal/api/web/inapp/6000000041976?orgId=7270648"; d.getElementsByTagName("head")[0].appendChild(s); })(); </script>
		<%-- <script type="text/javascript" >         window.ZohoHCAsap=window.ZohoHCAsap||function(a,b){ZohoHCAsap[a]=b;};(function(){var d=document;        var s=d.createElement("script");s.type="text/javascript";s.defer=true;        s.src="https://deskportal.localzoho.com/portal/api/web/inapp/29000003254001?orgId=1399266";        d.getElementsByTagName("head")[0].appendChild(s);        })(); </script> --%>
		<style >
		.center {
		  margin: auto;
		  width: 100%;
		  
		  border: 3px solid green;
		  padding: 10px;
		}
		.centerRed {
		  margin: auto;
		  width: 20%;
		  
		  border: 3px solid red;
		  padding: 10px;
	      margin-top: 10%;
		}
		</style>
	</head>
	<body>
	
		<%-- <div class="center">
			 <div>
				Available Active Agents : <span id="onlineAgentsStatus"><%=onlineAgentsZuidsResp%></span>
				<button id="refreshAgentStaus" onClick="POC_Vis.getAvaliableAgents()">Re-check</button>
			</div>
			<br>
			<div>
				Name : <input type="text" id="anonName" placeholder="Enter your name"/> 
				<button id="callNow" onClick="POC_Vis.click2Call()">Call Now</button>
			</div>
			<br>
			<div>
				<div id="callStausDiv">
					Call Status Logs: <span style="color:green"><b id="callStaus" ></b></span> <button onClick="$('#callStaus').text('');">Clear</button>	
				</div>
			</div>
		</div> --%>
		<div id="permBox" style="display:none" class="centerRed">
				<div id="permText">Press allow button to proceed the call further actions</div>
				<button id="permGrant" onClick="POC_Vis.openCalltoNewWindow()">Allow</button>
				<button id="PermDenied" onClick="POC_Vis.hidePermBox()">Denied</button>
		</div>
		
		<div id="logger" style="display:none"></div>
		<script>
			var SESSION_INFO = {};
			WmsliteImpl.handleMessage = function(mtype, msg) {
				log("mtype : "+ mtype+ " msg : "+ JSON.stringify(msg));
				POC_Vis.handleWMSMsg(msg);
			}
			
			WmsLite.serverup = function(userInfo){
				if(userInfo){
					SESSION_INFO = userInfo;
					var userInfoList = getUserInfoFromLocalStorage();
					userInfoList[userInfo.nname] = userInfo;
					localStorage.setItem("userInfo", JSON.stringify(userInfoList));
				}
				log("server up");
			}
			
			WmsLite.serverdown = function(){
				console.log("serverdown arguments ",arguments);
				log("server down");
			}
			
			function getUserInfoFromLocalStorage(){
				return JSON.parse(localStorage.getItem("userInfo")) || {};
			}
	
			function makeAjaxCall(url, data, methodType) {
				return new Promise(function(resolve, reject) {
					var xhr = new XMLHttpRequest();
					if (window.XMLHttpRequest) {
						// code for modern browsers
						xhr = new XMLHttpRequest();
					} else {
						// code for old IE browsers
						xhr = new ActiveXObject("Microsoft.XMLHTTP");
					}
					xhr.open(methodType, url, true);
					xhr.send(data);
					xhr.onreadystatechange = function() {
						if (xhr.readyState === 4) {
							if (xhr.status === 200) {
								var resp = xhr.responseText;
								resolve(resp);
								return;
							} 
							reject(xhr.status);
						} 
					}
				});
			}
			
			var PexAdaptor = (function(){
				var process = function(url, data, methodType){
					return new Promise(function(resolve, reject) {
						$pex.process(
					    {
					        header : { Cookie: "", "Content-Type" : "application/json"  },
					        data : data,
					        operation : "req."+methodType+"@ZS:"+url,
					        success : function( res ){
					            console.log(res.response.d);
					            resolve(res.response.d);
					        },
					        error : function( res ){
					        	console.log("error ",res);
					        	reject(res);
					        }
					    });
					});
				}
				
				return {
					process : process
				}
			})();
	
			function log(message) {
				var container = document.getElementById("logger");
				container.innerHTML += message + "<br/>";
			}
			var POC_Vis = {
					APIActions : {
						registerWMS : function (displayName){
							var url = "DWRutil.do?dwrMode=fetchAnonId&displayName="+encodeURIComponent(displayName);
							return makeAjaxCall(url, null, "GET")
						},
						makeC2C : function(callRefId,anonId){
							var url = "DWRutil.do?dwrMode=makeCall&anonId="+anonId+"&callRefId="+callRefId;
							return makeAjaxCall(url, null, "GET")
						},
						getAvaliableAgents : function(){
							var url = "DWRutil.do?dwrMode=getAvailableAgents";
							return makeAjaxCall(url, null, "GET")
						}
					},
					CxDetails : {
						anonName : function(){return $("#anonName").val()}, 				
						anonId : "",
						vistorURL: undefined 
					},
					CallDetails : {
						callRefId : "",
						getNewCallRefId : function(){
							this.callRefId = $.now()+""; 
							return this.callRefId;
						},
						callLog : function (msg){
							var time = new Date();
							log(time+" : "+msg);
						}
						 
					},
					registerWMS : function(cxId){
						return new Promise(function(_s,_f){
							var displayName = cxId+"".trim();
							if(displayName === ""){
								alert("Name is required");
								$("#anonName").focus();
								_f()
								return;
							}
							
							var callback = function(anonId){
								WmsLite.setNoDomainChange();
								WmsLite.setWmsContext("_wms");
								WmsLite.registerAnnon("ZS",anonId, displayName);
								
								POC_Vis.CxDetails.anonId = anonId;
								$("#anonName").attr("disabled", "disabled");
								_s();
							}
							
							var userInfoList = getUserInfoFromLocalStorage();
							if(userInfoList.hasOwnProperty(displayName)){
								var userObj = userInfoList[displayName];
								callback(userObj.zuid);
							}
							else {
								POC_Vis.APIActions.registerWMS().then(function(response){
									response = JSON.parse(response);
									callback(response.anonId);
								});
							}
						});
					},
					makeCall : function(callRefId){
						var anonId = POC_Vis.CxDetails.anonId;
						return new Promise(function(_s,_f){
							POC_Vis.APIActions.makeC2C(callRefId, anonId)
								.then(function(response){
									response = response !== "" ? JSON.parse(response) : {}
									var respCode = response.code;
									var respText = response.msg;
									var $callStaus = $("#callStaus");
									if(respCode < 0){
										$callStaus.text(respText);
										POC_Vis.getAvaliableAgents();
										POC_Vis.CallDetails.callLog(respText);
										_f();
									}
									else if ([3,4,5].indexOf(respCode) != -1){
										$callStaus.text(respText);
										POC_Vis.CallDetails.callLog(respText);
										_s();
									}
								});
						});
					},
					click2Call : function(){
						$("#callNow").attr("disabled","disabled");
						var _fCbk = function(){
							$("#callNow").removeAttr("disabled")
							
						}
						var _sCbk = function(){
							var callRefId = POC_Vis.CallDetails.getNewCallRefId();
							POC_Vis.makeCall(callRefId).catch(_fCbk);
							setTimeout(function(){$("#callNow").removeAttr("disabled")},1e4);
						}
						if(POC_Vis.CxDetails.anonId == ""){
							POC_Vis.registerWMS().then(_sCbk).catch(_fCbk)
						}	
						else{
							_sCbk();
						}
					},
					getAvaliableAgents : function(){
						var _sCbk =function (resp){
							$("#onlineAgentsStatus").text(resp);
						} 
						POC_Vis.APIActions.getAvaliableAgents().then(_sCbk);
					},
					handleWMSMsg : function(msg){
						var action = msg.action;
						var callRefId = msg.callRefId;
						if(callRefId === POC_Vis.CallDetails.callRefId){
							if(action == "meetingAction"){
								POC_Vis.CallDetails.vistorURL = (msg.vistorURL+"&name="+POC_Vis.CxDetails.anonName()).replace("http://","https://").replace("8080","8443"); 
								POC_Vis.showPermBox();
							}
							else if(action == "deskRoutingAction"){
								var respCode = msg.code;
								var respText = msg.msg;
								$("#callStaus").text(respText);
								
								POC_Vis.CallDetails.callLog(respText);
							}	
						}
					},
					showPermBox : function(){
						$("#permBox").show();
					},
					hidePermBox : function(){
						$("#permBox").hide();
						alert("sry innum work mudiyala :)")
					},
					openCalltoNewWindow : function(){
						$("#permBox").hide();
						window.open(POC_Vis.CallDetails.vistorURL);
					}
			} 
	
		</script>
	</body>
</html>