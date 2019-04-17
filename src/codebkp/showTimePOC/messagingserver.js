(function(win) {
  /*
        Some Common functions which would be used through out the code
    */

  var MSUtils = {};

  MSUtils.isNull = function(value) {
    if (value == null || value == undefined) {
      return true;
    } else {
      return false;
    }
  };

  // Note: uncomment this function for debugging/developing
  media_channel.Debug = {
    debugMode: false,

    log: function(info) {
      if (this.debugMode) {
        // console.log("Z_MS_LOG:",info); //no i18n
      }
    },
    warn: function(info) {
      if (this.debugMode) {
        // console.warn("Z_MS_WARN: "+info); //no i18n
      }
    },
    debug: function(info) {
      if (this.debugMode) {
        // console.debug("Z_MS_DEBUG: "+info); //no i18n
      }
    },
    high: function(info) {
      if (isDeveloper) {
        var dummy; //codecheck
        // console.log(info); //no i18n
      }
    },
    logConnection: function(info) {
      if (logConnection) {
        var dummy; //codecheck
        // console.log(info);
      }
    }
  };

  media_channel.trickleSupported = true;

  (media_channel.isWebrtcSupported = function() {
    var isWebrtcSupported =
      window.RTCPeerConnection !== undefined &&
      window.RTCPeerConnection !== null &&
      navigator.getUserMedia !== undefined &&
      navigator.getUserMedia !== null;
    this.trickleSupported = isWebrtcSupported;
    return isWebrtcSupported;
  }),
    (media_channel.webRTCConfigs = {
      //{urls: "turn:172.21.209.79:3748",username:"rahman",credential:"qwerty123456"}
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:8.47.10.103:443?transport=udp",
          username: "zconfuser",
          credential: "350rKC56r9A80SX"
        },
        {
          urls: "turn:8.47.10.103:443?transport=tcp",
          username: "zconfuser",
          credential: "350rKC56r9A80SX"
        }
      ], //no i18n

      iceTransportPolicy: "all", //no i18n

      bundlePolicy: undefined,

      ipv6Support: false

      //TODO: define Various Policies like LIC Policy and Yes, that's only a pun
      //iceTransportPolicy,bundlePolicy
    });

  media_channel.webRTCAdapter = adapter; //need to import adapter.js else this line would throw Error

  media_channel.attachMediaStream = function(element, stream, plugin) {
    if (this.webRTCAdapter.browserDetails.browser === "chrome") {
      try {
        var chromever = this.webRTCAdapter.browserDetails.version;
        if (chromever >= 43) {
          element.srcObject = stream;
        } else if (typeof element.src !== "undefined") {
          element.src = URL.createObjectURL(stream);
        } else {
          this.Debug.warn("Error attaching stream to element"); //no i18n
        }
      } catch (exception) {}
    } else {
      element.srcObject = stream;
    }
    element.setAttribute("data-streamId", plugin.streamId);
    var parent = element.parentNode;
    if (this.webRTCAdapter.browserDetails.browser === "chrome") {
      if (plugin.handleType != 1) {
        var audioEl = document.getElementById(plugin.pluginId + "-audio");
        if (!audioEl) {
          element.muted = true;
          var audio = document.createElement("audio");
          audio.id = plugin.pluginId + "-audio";
          var chromever = this.webRTCAdapter.browserDetails.version;
          if (chromever >= 43) {
            audio.srcObject = stream;
          } else if (typeof element.src !== "undefined") {
            audio.src = URL.createObjectURL(stream);
          } else {
            this.Debug.warn("Error attaching stream to element"); //no i18n
          }
          parent.appendChild(audio);
          var audioPromise = audio.play();
          if (audioPromise != undefined) {
            audioPromise
              .then(function() {
                plugin.Events.onVideoPlayBackSuccess.apply(plugin, [
                  { element: element, plugin: plugin, type: "audio" }
                ]); //no i18n
              })
              .catch(function(error) {
                if (error.code != 20) {
                  plugin.Events.onVideoPlayBackFailure.apply(plugin, [
                    {
                      element: element,
                      plugin: plugin,
                      error: error,
                      type: "audio" //no i18n
                    }
                  ]);
                }
              });
          }
        }
      }
    }

    var playPromise = element.play();
    if (playPromise != undefined) {
      playPromise
        .then(function() {
          // element.controls = false;
          plugin.Events.onVideoPlayBackSuccess.apply(plugin, [
            { element: element, plugin: plugin }
          ]);
        })
        .catch(function(error) {
          if (error.code != 20) {
            plugin.Events.onVideoPlayBackFailure.apply(plugin, [
              { element: element, plugin: plugin, error: error }
            ]);
            // var videoId = element.id;
            // var pluginId = videoId.substring(videoId.indexOf('-')+1);
            // // element.controls = true;
            // var videoFailDiv = document.getElementById("callbackfail-"+pluginId);
            // if(videoFailDiv && videoFailDiv.classList.contains('d-none-imp')){
            //     videoFailDiv.classList.remove('d-none-imp'); //no i18n
            // }
          }
          // console.log("error",error);
        });
    }
  };

  media_channel.allHandles = [];

  media_channel.messages_without_ack = [];

  media_channel.screenShareHandles = [];

  media_channel.queue_for_peer_creation = [];

  media_channel.promise_handling = function() {
    if (media_channel.queue_for_peer_creation.length > 0) {
      try {
        var obj = media_channel.queue_for_peer_creation[0];
        var promise = new Promise(function(resolve, reject) {
          media_channel.createPeerConnection(obj, resolve, reject);
        });
        promise.then(
          function(result) {
            media_channel.queue_for_peer_creation.shift();
            media_channel.promise_handling();
          },
          function(err) {
            //todo:-err in creating peer connection
            media_channel.queue_for_peer_creation.shift();
          }
        );
      } catch (err) {
        //todo
        //                console.log("err",err);
      }
    }
  };

  media_channel.handlePeerCreation = function(
    handle,
    params,
    isPublisher,
    responseEvent
  ) {
    var obj = {
      handle: handle,
      params: params,
      isPublisher: isPublisher,
      responseEvent: responseEvent
    };

    if (media_channel.queue_for_peer_creation.length == 0) {
      media_channel.queue_for_peer_creation.push(obj);
      media_channel.promise_handling();
    } else {
      media_channel.queue_for_peer_creation.push(obj);
    }
  };

  /*
    createPeerConnection needs handle object [publisher/subscriber] and params - [rtcConstraints : which is various constraints while creating peer connection]
    */
  media_channel.createPeerConnection = function(obj, resolve, reject) {
    try {
      var self = this;
      var webrtcConfig = self.webRTCConfigs;
      var handle = obj.handle;
      var config = handle.webrtcCORE;
      var responseEvent = obj.responseEvent;
      if (config.pc) {
        if (isPublisher) {
          // media_channel.createOffer(handle, {audio: true, video: true}, resolve, reject); this case doesnt exist.
        } else {
          var jsep = JSON.parse(responseEvent.responseString);
          var newOfferData = {};
          newOfferData.handle = handle;
          newOfferData.resolve = resolve;
          newOfferData.reject = reject;
          newOfferData.jsep = jsep;
          handle.Events.onNewOffer.apply(handle, [newOfferData]);
          // media_channel.setRemoteDescription(config, jsep, handle, resolve, reject);
        }
      } else {
        var params = obj.params;
        var isPublisher = obj.isPublisher;
        var pc_config = {
          iceServers: webrtcConfig.iceServers, //no i18n
          iceTransportPolicy: webrtcConfig.iceTransportPolicy, //no i18n
          bundlePolicy: webrtcConfig.bundlePolicy //no i18n
        }; //no i18n
        //~ var pc_constraints = {'mandatory': {'MozDontOfferDataChannel':true}};
        var pc_constraints = {
          optional: [{ DtlsSrtpKeyAgreement: true }] //no i18n
        };
        if (self.ipv6Support === true) {
          pc_constraints.optional.push({ googIPv6: true });
        }
        // Any custom constraint to add?
        if (
          params.rtcConstraints &&
          typeof params.rtcConstraints === "object"
        ) {
          for (var i in callbacks.rtcConstraints) {
            pc_constraints.optional.push(callbacks.rtcConstraints[i]);
          }
        }
        if (self.webRTCAdapter.browserDetails.browser === "edge") {
          // This is Edge, enable BUNDLE explicitly
          pc_config.bundlePolicy = "max-bundle"; //no i18n
        }
        var Debug = self.Debug;
        Debug.log(pc_constraints);
        config.pc = new RTCPeerConnection(pc_config, pc_constraints);
        Debug.debug(config.pc);
        if (config.pc.getStats) {
          // FIXME
          config.volume.value = 0;
          if (params.bitrate) {
            //console.log("Messaging Server bitrate --> ", params.bitrate);
            config.bitrate.value = params.bitrate; //no i18n
          }
        }
        Debug.log(
          "Preparing local SDP and gathering candidates (trickle=" +
            config.trickle +
            ")"
        );
        config.pc.onnegotiationneeded = function(e) {
          // console.log("onnegotiationNeeded",e.target.iceConnectionState,e.signallingState);
        };
        config.pc.oniceconnectionstatechange = function(e) {
          if (config.pc != null && config.pc.iceConnectionState == "failed") {
            // window.alert("iceStateFailed for handle "+handle.pluginId); //no i18n
            var failure = {
              handle: handle,
              reason: "iceFailed" //no i18n
            };
            // if(handle.handleType == 2){ //subscriber handle has failed. detach this to free up webrtc resources
            handle.Events.onFailure.apply(handle, [failure]);
            // }else if(handle.handleType ==1){
            //     handle.Events.onFailure.apply(handle, [failure]);
            // }
            //todo:- if state is disconnected or failed, restart ice exchange?
            if (config.pc) {
              var detail = {
                handle: handle,
                iceState: config.pc.iceConnectionState
              };
              if (handle.handleType == 2) {
                var event = new CustomEvent(
                  "iceStateChanged_" + handle.pluginId,
                  { detail: [detail] }
                ); //no i18n
                document.dispatchEvent(event);
              } else {
                handle.webrtcEvents.iceStateChanged.apply(handle, [
                  config.pc.iceConnectionState
                ]);
              }
            }
          }
        };
        config.pc.onsignalingstatechange = function(event) {
          var obj = {};
          obj.handle = handle;
          obj.signalingState = event.target.signalingState; //have-remote-offer or have-local-offer or stable or closed
          handle.Events.onSignalingStateChange.apply(handle, [obj]);
          if (event.target.signalingState == "stable") {
            // resolve();
          }
        };
        config.pc.onicecandidate = function(event) {
          if (
            event.candidate == null ||
            (self.webRTCAdapter.browserDetails.browser === "edge" &&
              event.candidate.candidate.indexOf("endOfCandidates") > 0)
          ) {
            Debug.log("End of candidates.");
            config.iceDone = true;
            if (config.trickle === true) {
              // Notify end of candidates
              // if (handle.connection.msgCh.documentEventListeners.indexOf("trickleIceCandidate_" + handle.pluginId) != -1) {
              var event = new CustomEvent(
                "trickleIceCandidate_" + handle.pluginId,
                { detail: [{ completed: true }] }
              ); //no i18n
              document.dispatchEvent(event);
              // } else {
              //     handle.webrtcEvents.trickleIceCandidate.apply(handle, [{completed: true}]);
              // }
            } else {
              // No trickle, time to send the complete SDP (including all candidates)
              // if (handle.connection.msgCh.documentEventListeners.indexOf("sdpWithIce_" + handle.pluginId) != -1) {
              if (handle.handleType == 1) {
                handle.webrtcEvents.sdpWithIce.apply(handle, [handle.mySdp]);
              } else {
                var event = new CustomEvent("sdpWithIce_" + handle.pluginId, {
                  detail: [handle.mySdp]
                }); //no i18n
                document.dispatchEvent(event);
              }
              // } else {
              //     handle.webrtcEvents.sdpWithIce.apply(handle, [handle.mySdp]);
              // }
            }
          } else {
            // JSON.stringify doesn't work on some WebRTC objects anymore
            // See https://code.google.com/p/chromium/issues/detail?id=467366
            var candidate = {
              candidate: event.candidate.candidate, //no i18n
              sdpMid: event.candidate.sdpMid, //no i18n
              sdpMLineIndex: event.candidate.sdpMLineIndex //no i18n
            };
            if (config.trickle === true) {
              // Send candidate
              // if (handle.connection.msgCh.documentEventListeners.indexOf("trickleIceCandidate_" + handle.pluginId) != -1) {
              if (handle.handleType == 1) {
                handle.webrtcEvents.trickleIceCandidate.apply(handle, [
                  candidate
                ]);
              } else {
                var event = new CustomEvent(
                  "trickleIceCandidate_" + handle.pluginId,
                  { detail: [candidate] }
                ); //no i18n
                document.dispatchEvent(event);
              }
              // } else {
              //     handle.webrtcEvents.trickleIceCandidate.apply(handle, [candidate]);
              // }
            }
          }
        };

        config.pc.error = function(error) {
          // console.log("error in PC",error);
        };

        config.pc.ontrack = function(event) {
          if (config.remoteStream !== undefined) {
            //since publisher handle doesn't implement remote streams
            Debug.log("Handling Remote Track");
            Debug.debug(event);
            if (!event.streams) {
              return;
            }

            config.remoteStream = event.streams[0];
            // if (handle.connection.msgCh.documentEventListeners.indexOf("remoteStream_" + handle.pluginId) != -1) {
            var event = new CustomEvent("remoteStream_" + handle.pluginId, {
              detail: [config.remoteStream]
            }); //no i18n
            document.dispatchEvent(event);
            // } else {
            //     handle.webrtcEvents.remoteStream.apply(handle, [config.remoteStream]);
            // }
          }
          if (event.track && !event.track.onended) {
            Debug.log("Adding onended callback to track:", event.track);
            event.track.onended = function(ev) {
              Debug.log("Remote track removed:", ev);
              if (config.remoteStream) {
                config.remoteStream.removeTrack(ev.target);
                // if (handle.connection.msgCh.documentEventListeners.indexOf("remoteStream_" + handle.pluginId) != -1) { //todo:- this is where we know subscribed strea, has ended
                var event = new CustomEvent("remoteStream_" + handle.pluginId, {
                  detail: [config.remoteStream]
                }); //no i18n
                document.dispatchEvent(event);
                // } else {
                //     handle.webrtcEvents.remoteStream.apply(handle, [config.remoteStream]);
                // }
              }
            };
          }
        };
        if (config.myStream !== undefined) {
          if (config.myStream) {
            Debug.log("Adding local stream");
            config.myStream.getTracks().forEach(function(track) {
              Debug.log("Adding local track:", track);
              config.pc.addTrack(track, config.myStream);
            });
            if (config.myStream.getVideoTracks()[0]) {
              //y does this exist? to detect when screenshare ends by clicking button`
              config.myStream.getVideoTracks()[0].onended = function(event) {
                //todo:-move to publisher object
                if (handle.source == 2) {
                  handle.closeMyPeerConnection(handle);
                  handle.detachHandle();
                }
                //                                else{
                //                                    //this event is not supposed to be triggered. some issue?
                //                                }
              };
            }
          }
          //                else{
          //                    //TODO: throw Stream Required to Publish Error
          //                }
        }
        if (isPublisher) {
          media_channel.createOffer(handle, params, resolve, reject); // Simulcast parameter is added here
        } else {
          var jsep = JSON.parse(responseEvent.responseString);
          media_channel.setRemoteDescription(
            config,
            jsep,
            handle,
            resolve,
            reject
          );
        }

        // return true;
      }
    } catch (exc) {
      reject();
    }
  };

  /*
    Tweaking SDP to enable simulcasting
    */
  media_channel.mungeSdpForSimulcasting = function(sdp) {
    // Let's munge the SDP to add the attributes for enabling simulcasting
    // (based on https://gist.github.com/ggarber/a19b4c33510028b9c657)
    var lines = sdp.split("\r\n");
    var video = false;
    var ssrc = [-1],
      ssrc_fid = [-1];
    var cname = null,
      msid = null,
      mslabel = null,
      label = null;
    var insertAt = -1;
    for (var i = 0; i < lines.length; i++) {
      var mline = lines[i].match(/m=(\w+) */);
      if (mline) {
        var medium = mline[1];
        if (medium === "video") {
          // New video m-line: make sure it's the first one
          if (ssrc[0] < 0) {
            video = true;
          } else {
            // We're done, let's add the new attributes here
            insertAt = i;
            break;
          }
        } else {
          // New non-video m-line: do we have what we were looking for?
          if (ssrc[0] > -1) {
            // We're done, let's add the new attributes here
            insertAt = i;
            break;
          }
        }
        continue;
      }
      if (!video) {
        continue;
      }

      var fid = lines[i].match(/a=ssrc-group:FID (\d+) (\d+)/);
      if (fid) {
        ssrc[0] = fid[1];
        ssrc_fid[0] = fid[2];
        lines.splice(i, 1);
        i--;
        continue;
      }
      if (ssrc[0]) {
        var match = lines[i].match("a=ssrc:" + ssrc[0] + " cname:(.+)");
        if (match) {
          cname = match[1];
        }
        match = lines[i].match("a=ssrc:" + ssrc[0] + " msid:(.+)");
        if (match) {
          msid = match[1];
        }
        match = lines[i].match("a=ssrc:" + ssrc[0] + " mslabel:(.+)");
        if (match) {
          mslabel = match[1];
        }
        match = lines[i].match("a=ssrc:" + ssrc + " label:(.+)");
        if (match) {
          label = match[1];
        }
        if (lines[i].indexOf("a=ssrc:" + ssrc_fid) === 0) {
          lines.splice(i, 1);
          i--;
          continue;
        }
        if (lines[i].indexOf("a=ssrc:" + ssrc[0]) === 0) {
          lines.splice(i, 1);
          i--;
          continue;
        }
      }
      if (lines[i].length == 0) {
        lines.splice(i, 1);
        i--;
        continue;
      }
    }
    if (ssrc[0] < 0) {
      // Couldn't find a FID attribute, let's just take the first video SSRC we find
      insertAt = -1;
      video = false;
      for (var i = 0; i < lines.length; i++) {
        var mline = lines[i].match(/m=(\w+) */);
        if (mline) {
          var medium = mline[1];
          if (medium === "video") {
            // New video m-line: make sure it's the first one
            if (ssrc[0] < 0) {
              video = true;
            } else {
              // We're done, let's add the new attributes here
              insertAt = i;
              break;
            }
          } else {
            // New non-video m-line: do we have what we were looking for?
            if (ssrc[0] > -1) {
              // We're done, let's add the new attributes here
              insertAt = i;
              break;
            }
          }
          continue;
        }
        if (!video) {
          continue;
        }

        if (ssrc[0] < 0) {
          var value = lines[i].match(/a=ssrc:(\d+)/);
          if (value) {
            ssrc[0] = value[1];
            lines.splice(i, 1);
            i--;
            continue;
          }
        } else {
          var match = lines[i].match("a=ssrc:" + ssrc[0] + " cname:(.+)");
          if (match) {
            cname = match[1];
          }
          match = lines[i].match("a=ssrc:" + ssrc[0] + " msid:(.+)");
          if (match) {
            msid = match[1];
          }
          match = lines[i].match("a=ssrc:" + ssrc[0] + " mslabel:(.+)");
          if (match) {
            mslabel = match[1];
          }
          match = lines[i].match("a=ssrc:" + ssrc[0] + " label:(.+)");
          if (match) {
            label = match[1];
          }
          if (lines[i].indexOf("a=ssrc:" + ssrc_fid[0]) === 0) {
            lines.splice(i, 1);
            i--;
            continue;
          }
          if (lines[i].indexOf("a=ssrc:" + ssrc[0]) === 0) {
            lines.splice(i, 1);
            i--;
            continue;
          }
        }
        if (lines[i].length == 0) {
          lines.splice(i, 1);
          i--;
          continue;
        }
      }
    }
    if (ssrc[0] < 0) {
      // Still nothing, let's just return the SDP we were asked to munge
      //Janus.warn("Couldn't find the video SSRC, simulcasting NOT enabled"); //no i18n
      return sdp;
    }
    if (insertAt < 0) {
      // Append at the end
      insertAt = lines.length;
    }
    // Generate a couple of SSRCs (for retransmissions too)
    // Note: should we check if there are conflicts, here?
    ssrc[1] = Math.floor(Math.random() * 0xffffffff);
    ssrc[2] = Math.floor(Math.random() * 0xffffffff);
    ssrc_fid[1] = Math.floor(Math.random() * 0xffffffff);
    ssrc_fid[2] = Math.floor(Math.random() * 0xffffffff);
    // Add attributes to the SDP
    for (var i = 0; i < ssrc.length; i++) {
      if (cname) {
        lines.splice(insertAt, 0, "a=ssrc:" + ssrc[i] + " cname:" + cname); //no i18n
        insertAt++;
      }
      if (msid) {
        lines.splice(insertAt, 0, "a=ssrc:" + ssrc[i] + " msid:" + msid); //no i18n
        insertAt++;
      }
      if (mslabel) {
        lines.splice(insertAt, 0, "a=ssrc:" + ssrc[i] + " mslabel:" + mslabel); //no i18n
        insertAt++;
      }
      if (label) {
        lines.splice(insertAt, 0, "a=ssrc:" + ssrc[i] + " label:" + label); //no i18n
        insertAt++;
      }
      // Add the same info for the retransmission SSRC
      if (cname) {
        lines.splice(insertAt, 0, "a=ssrc:" + ssrc_fid[i] + " cname:" + cname); //no i18n
        insertAt++;
      }
      if (msid) {
        lines.splice(insertAt, 0, "a=ssrc:" + ssrc_fid[i] + " msid:" + msid); //no i18n
        insertAt++;
      }
      if (mslabel) {
        lines.splice(
          insertAt,
          0,
          "a=ssrc:" + ssrc_fid[i] + " mslabel:" + mslabel
        ); //no i18n
        insertAt++;
      }
      if (label) {
        lines.splice(insertAt, 0, "a=ssrc:" + ssrc_fid[i] + " label:" + label); //no i18n
        insertAt++;
      }
    }
    lines.splice(
      insertAt,
      0,
      "a=ssrc-group:FID " + ssrc[2] + " " + ssrc_fid[2]
    );
    lines.splice(
      insertAt,
      0,
      "a=ssrc-group:FID " + ssrc[1] + " " + ssrc_fid[1]
    );
    lines.splice(
      insertAt,
      0,
      "a=ssrc-group:FID " + ssrc[0] + " " + ssrc_fid[0]
    );
    lines.splice(
      insertAt,
      0,
      "a=ssrc-group:SIM " + ssrc[0] + " " + ssrc[1] + " " + ssrc[2]
    );
    sdp = lines.join("\r\n"); //no i18n
    if (!sdp.endsWith("\r\n")) {
      sdp += "\r\n";
    } //no i18n

    return sdp;
  };

  /*
    createOffer has handle Object [publisher/subscriber] and options - [simulcast,iceRestart,audio(or)audioSend,audioReceive,removeAudio(removing audio in renegotiation),video(or)videoSend,videoReceive,removeVideo(removing video in renegotiation)]
    */
  media_channel.createOffer = function(handle, options, resolve, reject) {
    try {
      var debug = this.Debug;
      var config = handle.webrtcCORE;
      var simulcast = options.simulcast === true ? true : false;
      var self = this;
      if (!simulcast) {
        debug.log("Creating offer (iceDone=" + config.iceDone + ")");
      } else {
        debug.log(
          "Creating offer (iceDone=" +
            config.iceDone +
            ", simulcast=" +
            simulcast +
            ")"
        );
      }
      // https://code.google.com/p/webrtc/issues/detail?id=3508
      var mediaConstraints = {};
      if (
        (this.webRTCAdapter.browserDetails.browser === "firefox" &&
          this.webRTCAdapter.browserDetails.version >= 59) ||
        (this.webRTCAdapter.browserDetails.browser == "chrome" &&
          this.webRTCAdapter.browserDetails.version >= 72)
      ) {
        // Firefox >= 59 uses Transceivers nd chrome >=72
        var audioTransceiver = null,
          videoTransceiver = null;
        var transceivers = config.pc.getTransceivers();
        if (transceivers && transceivers.length > 0) {
          for (var i in transceivers) {
            var t = transceivers[i];
            if (
              (t.sender && t.sender.track && t.sender.track.kind === "audio") ||
              (t.receiver &&
                t.receiver.track &&
                t.receiver.track.kind === "audio")
            ) {
              if (!audioTransceiver) {
                audioTransceiver = t;
              }

              continue;
            }
            if (
              (t.sender && t.sender.track && t.sender.track.kind === "video") ||
              (t.receiver &&
                t.receiver.track &&
                t.receiver.track.kind === "video")
            ) {
              if (!videoTransceiver) {
                videoTransceiver = t;
              }

              continue;
            }
          }
        }
        // Handle audio (and related changes, if any)
        var audioSend = options.audioSend || options.audio;
        var audioRecv = options.audioReceive ? true : false;
        if (!audioSend && !audioRecv) {
          // Audio disabled: have we removed it?
          if (options.removeAudio && audioTransceiver) {
            audioTransceiver.direction = "inactive"; //no i18n
            debug.log(
              "Setting audio transceiver to inactive:",
              audioTransceiver
            );
          }
        } else {
          // Take care of audio m-line
          if (audioSend && audioRecv) {
            if (audioTransceiver) {
              audioTransceiver.direction = "sendrecv"; //no i18n
              debug.log(
                "Setting audio transceiver to sendrecv:",
                audioTransceiver
              );
            }
          } else if (audioSend && !audioRecv) {
            if (audioTransceiver) {
              audioTransceiver.direction = "sendonly"; //no i18n
              debug.log(
                "Setting audio transceiver to sendonly:",
                audioTransceiver
              );
            }
          } else if (!audioSend && audioRecv) {
            if (audioTransceiver) {
              audioTransceiver.direction = "recvonly"; //no i18n
              debug.log(
                "Setting audio transceiver to recvonly:",
                audioTransceiver
              );
            } else {
              // In theory, this is the only case where we might not have a transceiver yet
              audioTransceiver = config.pc.addTransceiver("audio", {
                direction: "recvonly"
              }); //no i18n
              debug.log("Adding recvonly audio transceiver:", audioTransceiver);
            }
          }
        }
        // Handle video (and related changes, if any)
        var videoSend = options.videoSend || options.video;
        var videoRecv = options.videoReceive ? true : false;
        if (!videoSend && !videoRecv) {
          // Video disabled: have we removed it?
          if (options.removeVideo && videoTransceiver) {
            videoTransceiver.direction = "inactive"; //no i18n
            debug.log(
              "Setting video transceiver to inactive:",
              videoTransceiver
            );
          }
        } else {
          // Take care of video m-line
          if (videoSend && videoRecv) {
            if (videoTransceiver) {
              videoTransceiver.direction = "sendrecv"; //no i18n
              debug.log(
                "Setting video transceiver to sendrecv:",
                videoTransceiver
              );
            }
          } else if (videoSend && !videoRecv) {
            if (videoTransceiver) {
              videoTransceiver.direction = "sendonly"; //no i18n
              debug.log(
                "Setting video transceiver to sendonly:",
                videoTransceiver
              );
            }
          } else if (!videoSend && videoRecv) {
            if (videoTransceiver) {
              videoTransceiver.direction = "recvonly"; //no i18n
              debug.log(
                "Setting video transceiver to recvonly:",
                videoTransceiver
              );
            } else {
              // In theory, this is the only case where we might not have a transceiver yet
              videoTransceiver = config.pc.addTransceiver("video", {
                direction: "recvonly"
              }); //no i18n
              debug.log("Adding recvonly video transceiver:", videoTransceiver);
            }
          }
        }
      } else {
        mediaConstraints.offerToReceiveAudio = options.audioReceive
          ? true
          : false;
        mediaConstraints.offerToReceiveVideo = options.videoReceive
          ? true
          : false;
      }
      var iceRestart = options.iceRestart === true ? true : false;
      // if (iceRestart) {
      mediaConstraints.iceRestart = true;
      // }
      debug.debug(mediaConstraints);
      // Check if this is Firefox and we've been asked to do simulcasting
      var sendVideo = options.video === true ? true : false;
      if (
        sendVideo &&
        simulcast &&
        self.webRTCAdapter.browserDetails.browser === "firefox"
      ) {
        // FIXME Based on https://gist.github.com/voluntas/088bc3cc62094730647b
        debug.log("Enabling Simulcasting for Firefox (RID)");
        var sender = config.pc.getSenders()[1];
        debug.log(sender);
        var parameters = sender.getParameters();
        debug.log(parameters);
        sender.setParameters({
          encodings: [
            //scaleResolutionDownBy factor is added to manually reduce the resolution for simulcast in firefox browser
            {
              rid: "high",
              active: true,
              priority: "high",
              maxBitrate: 1536000,
              scaleResolutionDownBy: 1.0
            }, //no i18n
            {
              rid: "medium",
              active: true,
              priority: "medium",
              maxBitrate: 600000,
              scaleResolutionDownBy: 2.0
            }, //no i18n
            {
              rid: "low",
              active: true,
              priority: "low",
              maxBitrate: 180000,
              scaleResolutionDownBy: 4.0
            } //no i18n
          ]
        });
      }
      config.pc.createOffer(mediaConstraints).then(
        function(offer) {
          debug.debug(offer);
          debug.log("Setting local description");
          if (sendVideo && simulcast) {
            // This SDP munging only works with Chrome
            if (self.webRTCAdapter.browserDetails.browser === "chrome") {
              debug.log("Enabling Simulcasting for Chrome (SDP munging)");
              offer.sdp = self.mungeSdpForSimulcasting(offer.sdp);
            } else if (
              self.webRTCAdapter.browserDetails.browser !== "firefox"
            ) {
              debug.warn(
                "simulcast=true, but this is not Chrome nor Firefox, ignoring"
              ); //no i18n
            }
          }
          config.mySdp = offer.sdp;
          config.pc.setLocalDescription(offer);
          config.mediaConstraints = mediaConstraints;
          if (!config.iceDone && !config.trickle) {
            // Don't do anything until we have all candidates
            debug.log("Waiting for all candidates...");
            return;
          }
          debug.log("Offer ready");
          // JSON.stringify doesn't work on some WebRTC objects anymore
          // See https://code.google.com/p/chromium/issues/detail?id=467366
          var jsep = {
            type: offer.type, //no i18n
            sdp: offer.sdp //no i18n
          };
          handle.webrtcEvents.sdpOffer.apply(handle, [undefined, jsep]);
          resolve();
        },
        function(error) {
          reject({ error: error }); //no i18n
          handle.webrtcEvents.sdpOffer.apply(handle, [error]);
        }
      );
    } catch (e) {
      reject({ error: error }); //no i18n
      //            console.log("eeeeeee",e);
    }
  };

  media_channel.createNewOffer = function(handle, mediaConstraints, streamObj) {
    var browser = media_channel.webRTCAdapter.browserDetails.browser;
    var version = media_channel.webRTCAdapter.browserDetails.version;
    var config = handle.webrtcCORE;
    if (config.myStream !== undefined) {
      if (config.myStream) {
        if (
          mediaConstraints.isAudioChanged == true &&
          mediaConstraints.audio != "none"
        ) {
          if (mediaConstraints.replaceAudio == true) {
            if (
              (browser == "firefox" && version >= 59) ||
              (browser == "chrome" && version >= 72)
            ) {
              for (var index in config.pc.getSenders()) {
                var s = config.pc.getSenders()[index];
                if (s && s.track && s.track.kind === "audio") {
                  s.replaceTrack(streamObj.getAudioTracks()[0]);
                }
              }
            } else {
              for (var index in config.pc.getSenders()) {
                var s = config.pc.getSenders()[index];
                if (s && s.track && s.track.kind === "audio") {
                  config.pc.removeTrack(s);
                  // s.replaceTrack(null);
                }
              }
              config.pc.addTrack(
                config.myStream.getAudioTracks()[0],
                config.myStream
              );
            }
          } else if (mediaConstraints.addAudio == true) {
            //addaudio code
            if (
              (browser == "firefox" && version >= 59) ||
              (browser == "chrome" && version >= 72)
            ) {
              var videoTransceiver = null;
              var transceivers = config.pc.getTransceivers();
              if (transceivers && transceivers.length > 0) {
                for (var i in transceivers) {
                  var t = transceivers[i];
                  if (
                    (t.sender &&
                      t.sender.track &&
                      t.sender.track.kind === "audio") ||
                    (t.receiver &&
                      t.receiver.track &&
                      t.receiver.track.kind === "audio")
                  ) {
                    //no i18n
                    videoTransceiver = t;
                    break;
                  }
                }
              }
              if (videoTransceiver && videoTransceiver.sender) {
                videoTransceiver.sender.replaceTrack(
                  streamObj.getAudioTracks()[0]
                );
              } else {
                config.pc.addTrack(
                  streamObj.getAudioTracks()[0],
                  config.myStream
                );
              }
            } else {
              config.pc.addTrack(
                streamObj.getAudioTracks()[0],
                config.myStream
              );
            }
          }
        }
        if (
          mediaConstraints.isVideoChanged == true &&
          mediaConstraints.video != "none"
        ) {
          if (mediaConstraints.replaceVideo == true) {
            if (
              (browser == "firefox" && version >= 59) ||
              (browser == "chrome" && version >= 72)
            ) {
              for (var index in config.pc.getSenders()) {
                var s = config.pc.getSenders()[index];
                if (s && s.track && s.track.kind === "video") {
                  s.replaceTrack(streamObj.getVideoTracks()[0]);
                }
              }
            } else {
              if (config.pc && config.pc.getSenders()) {
                for (var index in config.pc.getSenders()) {
                  var s = config.pc.getSenders()[index];
                  if (s && s.track && s.track.kind === "video") {
                    config.pc.removeTrack(s);
                    // s.replaceTrack(null);
                  }
                }
                config.pc.addTrack(
                  config.myStream.getVideoTracks()[0],
                  config.myStream
                );
              }
            }
          } else if (mediaConstraints.addVideo == true) {
            //addaudio code
            if (
              (browser == "firefox" && version >= 59) ||
              (browser == "chrome" && version >= 72)
            ) {
              var videoTransceiver = null;
              var transceivers = config.pc.getTransceivers();
              if (transceivers && transceivers.length > 0) {
                for (var i in transceivers) {
                  var t = transceivers[i];
                  if (
                    (t.sender &&
                      t.sender.track &&
                      t.sender.track.kind === "video") ||
                    (t.receiver &&
                      t.receiver.track &&
                      t.receiver.track.kind === "video")
                  ) {
                    //no i18n
                    videoTransceiver = t;
                    break;
                  }
                }
              }
              if (videoTransceiver && videoTransceiver.sender) {
                videoTransceiver.sender.replaceTrack(
                  streamObj.getVideoTracks()[0]
                );
              } else {
                for (var index in config.pc.getSenders()) {
                  var s = config.pc.getSenders()[index];
                  if (s && s.track && s.track.kind === "video") {
                    config.pc.removeTrack(s);
                  }
                }
                config.pc.addTrack(
                  streamObj.getVideoTracks()[0],
                  config.myStream
                );
              }
            } else {
              for (var index in config.pc.getSenders()) {
                var s = config.pc.getSenders()[index];
                if (s && s.track && s.track.kind === "video") {
                  config.pc.removeTrack(s);
                }
              }
              config.pc.addTrack(
                streamObj.getVideoTracks()[0],
                config.myStream
              );
            }
          }
        }
      }
    }
    var constraints = {
      offerToReceiveAudio: false,
      offerToReceiveVideo: false
    };
    // if()
    if (config.pc) {
      config.pc.createOffer(mediaConstraints).then(
        function(offer) {
          config.mySdp = offer.sdp;
          config.pc.setLocalDescription(offer);
          config.mediaConstraints = mediaConstraints;
          if (!config.iceDone && !config.trickle) {
            // Don't do anything until we have all candidates
            return;
          }
          // JSON.stringify doesn't work on some WebRTC objects anymore
          // See https://code.google.com/p/chromium/issues/detail?id=467366
          var jsep = {
            type: offer.type, //no i18n
            sdp: offer.sdp //no i18n
          };
          handle.webrtcEvents.sdpOffer.apply(handle, [undefined, jsep]);
        },
        function(error) {
          handle.webrtcEvents.sdpOffer.apply(handle, [error]);
        }
      );
    }
  };

  media_channel.setRemoteDescription = function(
    config,
    jsep,
    handle,
    resolve,
    reject
  ) {
    var description = new RTCSessionDescription(jsep);
    config.pc.setRemoteDescription(description).then(
      function() {
        media_channel.Debug.log("Remote description accepted!");
        config.remoteSdp = description.sdp;
        // Any trickle candidate we cached?
        if (config.candidates && config.candidates.length > 0) {
          for (var i in config.candidates) {
            var candidate = config.candidates[i];
            media_channel.Debug.log("Adding remote candidate:", candidate); //no i18n
            if (!candidate || candidate.completed === true) {
              // end-of-candidates
              config.pc.addIceCandidate();
            } else {
              // New candidate
              config.pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
          }
          config.candidates = [];
        }
        // Create the answer now
        media_channel.createAnswer(
          handle,
          {
            audioReceive: true,
            videoReceive: true,
            audio: false,
            video: false
          },
          resolve,
          reject
        );
      },
      function(error) {
        //TODO: throw Error
        reject({ error: error }); //no i18n
        error = error + ""; //TODO:remove this line
      }
    );
  };

  /*
    CreateAnswer handle - [publisher/subscriber] object, options - [simulcast,audio(or)audioSend,audioReceive,removeAudio(removing audio in renegotiation),video(or)videoSend,videoReceive,removeVideo(removing video in renegotiation)]
    */

  media_channel.createAnswer = function(handle, options, resolve, reject) {
    var config = handle.webrtcCORE;
    var Z_MS = this.Debug;
    var self = this;
    var simulcast = handle.simulcast === true ? true : false;
    if (!simulcast) {
      Z_MS.log("Creating answer (iceDone=" + config.iceDone + ")");
    } else {
      Z_MS.log(
        "Creating answer (iceDone=" +
          config.iceDone +
          ", simulcast=" +
          simulcast +
          ")"
      );
    }
    var mediaConstraints = null;
    if (
      (this.webRTCAdapter.browserDetails.browser === "firefox" &&
        this.webRTCAdapter.browserDetails.version >= 59) ||
      (this.webRTCAdapter.browserDetails.browser === "chrome" &&
        this.webRTCAdapter.browserDetails.version >= 72)
    ) {
      // Firefox >= 59 uses Transceivers
      mediaConstraints = {};
      var audioTransceiver = null,
        videoTransceiver = null;
      var transceivers = config.pc.getTransceivers();
      if (transceivers && transceivers.length > 0) {
        for (var i in transceivers) {
          var t = transceivers[i];
          if (
            (t.sender && t.sender.track && t.sender.track.kind === "audio") ||
            (t.receiver &&
              t.receiver.track &&
              t.receiver.track.kind === "audio")
          ) {
            //no i18n
            if (!audioTransceiver) {
              audioTransceiver = t;
            }

            continue;
          }
          if (
            (t.sender && t.sender.track && t.sender.track.kind === "video") ||
            (t.receiver &&
              t.receiver.track &&
              t.receiver.track.kind === "video")
          ) {
            //no i18n
            if (!videoTransceiver) {
              videoTransceiver = t;
            }

            continue;
          }
        }
      }
      // Handle audio (and related changes, if any)
      var audioSend = options.audio || options.audioSend;
      var audioRecv = options.audioReceive === true ? true : false;
      if (!audioSend && !audioRecv) {
        // Audio disabled: have we removed it?
        if (options.removeAudio && audioTransceiver) {
          if (!audioTransceiver.stopped) {
            audioTransceiver.direction = "inactive"; //no i18n
            Z_MS.log(
              "Setting audio transceiver to inactive:",
              audioTransceiver
            );
          }
        }
      } else {
        // Take care of audio m-line
        if (audioSend && audioRecv) {
          if (audioTransceiver) {
            if (!audioTransceiver.stopped) {
              audioTransceiver.direction = "sendrecv"; //no i18n
              Z_MS.log(
                "Setting audio transceiver to sendrecv:",
                audioTransceiver
              );
            }
          }
        } else if (audioSend && !audioRecv) {
          if (audioTransceiver) {
            if (!audioTransceiver.stopped) {
              audioTransceiver.direction = "sendonly"; //no i18n
              Z_MS.log(
                "Setting audio transceiver to sendonly:",
                audioTransceiver
              );
            }
          }
        } else if (!audioSend && audioRecv) {
          if (audioTransceiver) {
            if (!audioTransceiver.stopped) {
              audioTransceiver.direction = "recvonly"; //no i18n
              Z_MS.log(
                "Setting audio transceiver to recvonly:",
                audioTransceiver
              );
            }
          } else {
            // In theory, this is the only case where we might not have a transceiver yet
            audioTransceiver = config.pc.addTransceiver("audio", {
              direction: "recvonly"
            }); //no i18n
            Z_MS.log("Adding recvonly audio transceiver:", audioTransceiver);
          }
        }
      }
      // Handle video (and related changes, if any)
      var videoSend = options.video || options.videoSend;
      var videoRecv = options.videoReceive === true ? true : false;
      if (!videoSend && !videoRecv) {
        // Video disabled: have we removed it?
        if (options.removeVideo && videoTransceiver) {
          if (!videoTransceiver.stopped) {
            videoTransceiver.direction = "inactive"; //no i18n
            Z_MS.log(
              "Setting video transceiver to inactive:",
              videoTransceiver
            );
          }
        }
      } else {
        // Take care of video m-line
        if (videoSend && videoRecv) {
          if (videoTransceiver) {
            if (!videoTransceiver.stopped) {
              videoTransceiver.direction = "sendrecv"; //no i18n
              Z_MS.log(
                "Setting video transceiver to sendrecv:",
                videoTransceiver
              );
            }
          }
        } else if (videoSend && !videoRecv) {
          if (videoTransceiver) {
            if (!videoTransceiver.stopped) {
              videoTransceiver.direction = "sendonly"; //no i18n
              Z_MS.log(
                "Setting video transceiver to sendonly:",
                videoTransceiver
              );
            }
          }
        } else if (!videoSend && videoRecv) {
          if (videoTransceiver) {
            if (!videoTransceiver.stopped) {
              videoTransceiver.direction = "recvonly"; //no i18n
              Z_MS.log(
                "Setting video transceiver to recvonly:",
                videoTransceiver
              );
            }
          } else {
            // In theory, this is the only case where we might not have a transceiver yet
            videoTransceiver = config.pc.addTransceiver("video", {
              direction: "recvonly"
            }); //no i18n
            Z_MS.log("Adding recvonly video transceiver:", videoTransceiver);
          }
        }
      }
    } else {
      if (
        this.webRTCAdapter.browserDetails.browser == "firefox" ||
        this.webRTCAdapter.browserDetails.browser == "edge"
      ) {
        mediaConstraints = {
          offerToReceiveAudio: options.audioReceive,
          offerToReceiveVideo: options.videoReceive
        };
      } else {
        mediaConstraints = {
          mandatory: {
            OfferToReceiveAudio: options.audioReceive,
            OfferToReceiveVideo: options.videoReceive
          }
        };
      }
    }
    Z_MS.debug(mediaConstraints);
    // Check if this is Firefox and we've been asked to do simulcasting
    var sendVideo = options.video || options.videoSend;
    if (
      sendVideo &&
      simulcast &&
      this.webRTCAdapter.browserDetails.browser === "firefox"
    ) {
      // FIXME Based on https://gist.github.com/voluntas/088bc3cc62094730647b
      Z_MS.log("Enabling Simulcasting for Firefox (RID)");
      var sender = config.pc.getSenders()[1];
      Z_MS.log(sender);
      var parameters = sender.getParameters();
      Z_MS.log(parameters);
      sender.setParameters({
        encodings: [
          //scaleResolutionDownBy factor is added to manually reduce the resolution for simulcast in firefox browser
          {
            rid: "high",
            active: true,
            priority: "high",
            maxBitrate: 1536000,
            scaleResolutionDownBy: 1.0
          }, //no i18n
          {
            rid: "medium",
            active: true,
            priority: "medium",
            maxBitrate: 600000,
            scaleResolutionDownBy: 2.0
          }, //no i18n
          {
            rid: "low",
            active: true,
            priority: "low",
            maxBitrate: 180000,
            scaleResolutionDownBy: 4.0
          } //no i18n
        ]
      });
    }
    config.pc.createAnswer(mediaConstraints).then(
      function(answer) {
        Z_MS.debug(answer);
        Z_MS.log("Setting local description");
        if (sendVideo && simulcast) {
          // This SDP munging only works with Chrome
          if (self.webRTCAdapter.browserDetails.browser === "chrome") {
            // FIXME Apparently trying to simulcast when answering breaks video in Chrome...
            //~ Janus.log("Enabling Simulcasting for Chrome (SDP munging)");
            //~ answer.sdp = mungeSdpForSimulcasting(answer.sdp);
            Z_MS.warn(
              "simulcast=true, but this is an answer, and video breaks in Chrome if we enable it"
            ); //no i18n
          } else if (self.webRTCAdapter.browserDetails.browser !== "firefox") {
            Z_MS.warn(
              "simulcast=true, but this is not Chrome nor Firefox, ignoring"
            ); //no i18n
          }
        }
        config.mySdp = answer.sdp;
        config.pc.setLocalDescription(answer);
        config.mediaConstraints = mediaConstraints;
        if (!config.iceDone && !config.trickle) {
          // Don't do anything until we have all candidates
          Z_MS.log("Waiting for all candidates...");
          return;
        }
        // JSON.stringify doesn't work on some WebRTC objects anymore
        // See https://code.google.com/p/chromium/issues/detail?id=467366
        var jsep = {
          type: answer.type, //no i18n
          sdp: answer.sdp, //no i18n
          error: undefined //no i18n
        };
        // if(handle.connection.msgCh.documentEventListeners.indexOf("sdpAnswer_"+handle.pluginId)!=-1) {
        var event = new CustomEvent("sdpAnswer_" + handle.pluginId, {
          detail: [jsep]
        }); //no i18n
        document.dispatchEvent(event);
        // }else{
        //     console.log("mediaconstraints event applied","sdpAnswer_"+handle.pluginId);
        //     handle.webrtcEvents.sdpAnswer.apply(handle,[undefined,jsep]);
        // }
        resolve();
      },
      function(error) {
        var error = {
          error: error //no i18n
        };
        reject(error);
        //            if(handle.connection.msgCh.documentEventListeners.indexOf("sdpAnswer_"+handle.pluginId)!=-1) {
        var event = new CustomEvent("sdpAnswer_" + handle.pluginId, {
          detail: [error]
        }); //no i18n
        document.dispatchEvent(event);
        //            }else{
        //                handle.webrtcEvents.sdpAnswer.apply(handle,[error]);}
      }
    );
  };

  media_channel.processRemoteJsep = function(handle, options) {
    var jsep = options.jsep;
    var config = handle.webrtcCORE;
    var Z_MS = this.Debug;
    var self = this;

    if (jsep !== undefined && jsep !== null) {
      if (config.pc === null) {
        Z_MS.warn(
          "Wait, no PeerConnection?? if this is an answer, use createAnswer and not handleRemoteJsep"
        ); //no i18n
        handle.webrtcEvents.remoteJsepProcessed.apply(handle, [
          "CREATE_PEERCONNECTION"
        ]);
        return;
      }
      config.pc.setRemoteDescription(
        new RTCSessionDescription(jsep),
        function() {
          Z_MS.log("Remote description accepted!");
          config.remoteSdp = jsep.sdp;
          // Any trickle candidate we cached?
          if (config.candidates && config.candidates.length > 0) {
            for (var i in config.candidates) {
              var candidate = config.candidates[i];
              Z_MS.debug("Adding remote candidate:", candidate); //no i18n
              if (!candidate || candidate.completed === true) {
                // end-of-candidates
                config.pc.addIceCandidate();
              } else {
                // New candidate
                config.pc.addIceCandidate(new RTCIceCandidate(candidate));
              }
            }
            config.candidates = [];
          }
          // Done
          handle.webrtcEvents.remoteJsepProcessed.apply(handle, [
            undefined,
            "setting remote description success"
          ]);
        },
        function(error) {
          handle.webrtcEvents.remoteJsepProcessed.apply(handle, [error]);
        }
      );
    } else {
      handle.webrtcEvents.remoteJsepProcessed.apply(handle, ["Invalid Jsep"]);
    }
  };

  /*

    A global Object for getting an instance of various channels

    */

  win.CS = function() {
    this.init();
  };

  CS.prototype = {
    serviceId: undefined,

    getMessagingChannel: function(roomId) {
      return new cm_server(roomId);
    },

    getMediaChannel: function(messagingChannel) {
      return new media_channel(messagingChannel);
    }
  };

  win.IS_CORS_REQ = true;
  /*

        A Custom Object for constructing Communication server based proto request

    */

  /*
        Request Reference


        {
          "serviceId": "ST",
          "roomId": "123456789987",
          "request": {
            "processMessage": {
              "eventType": {
                "taskEvent": {
                  "event": "SEND_MESSAGE"
                }
              },
              "requestParams": [{
                "roomId": "123456789987",
                "content": "I am testing this and it better be working"
              }, {
                "roomId": "12345678900",
                "content": "I am testing this and it better be working 2"
              }],
              "mode": {
                "sendToServer": true
              }
            }
          },
          "transactionId": "IAMVERYHAPPY"
        }

        // Create User Json Reference


        {
          "serviceId": "ST",
          "roomId": "1530194398167",
          "request": {
            "processMessage": {
              "eventType": {
                "taskEvent": {
                  "event": "CREATE_USER"
                }
              },
              "mode": {
                "sendToServer": true
              }
            }
          },
          "transactionId": "QWERTYUSERCRT"
        }

    */

  win.CS_PROTO = function(roomId, serviceId) {
    this.init(roomId, serviceId);
  };

  CS_PROTO.prototype = {
    serviceId: "ST", //no i18n

    roomId: undefined,

    EventPipeLines: Object.freeze({
      MEDIA: "Media", //no i18n

      MESSAGE: "Message", //no i18n

      APPLICATION: "Application" //no i18n
    }),

    MessageEvents: Object.freeze({
      CREATE_USER: { EVENT: "CREATE_USER", TYPE: "MOD" }, //no i18n

      KEEP_ALIVE: { EVENT: "KEEP_ALIVE", TYPE: "TASK" }, //no i18n

      SEND_MESSAGE: { EVENT: "SEND_MESSAGE", TYPE: "TASK" }, //no i18n

      JOIN_ROOM: { EVENT: "JOIN_ROOM", TYPE: "TASK" }, //no i18n

      JOIN_GROUP: { EVENT: "JOIN_GROUP", TYPE: "TASK" }, //no i18n

      LEAVE_GROUP: { EVENT: "LEAVE_GROUP", TYPE: "TASK" }, //no i18n

      LEAVE_ROOM: { EVENT: "LEAVE_ROOM", TYPE: "TASK" }, //no i18n

      JOINED_ROOM: { EVENT: "JOINED_ROOM", TYPE: "TASK" }, //no i18n

      LEFT_ROOM: { EVENT: "LEFT_ROOM", TYPE: "TASK" }, //no i18n

      ANNOTATE_ACTION: { EVENT: "ANNOTATE_ACTION", TYPE: "TASK" } //no i18n
    }),

    MediaEvents: Object.freeze({
      KICKOUT_USER: { EVENT: "KICKOUT_USER", TYPE: "MOD" }, //no i18n

      RECORD: { EVENT: "RECORD", TYPE: "MOD" }, //no i18n

      LEAVE_ROOM: { EVENT: "LEAVE_ROOM", TYPE: "MOD" }, //no i18n

      INIT_CONNECTION: { EVENT: "INIT_CONNECTION", TYPE: "TASK" }, //no i18n

      INIT_PLUGIN: { EVENT: "INIT_PLUGIN", TYPE: "TASK" }, //no i18n

      MAP_ROOM_TO_PLUGIN: { EVENT: "MAP_ROOM_TO_PLUGIN", TYPE: "TASK" }, //no i18n

      PUBLISH_STREAM: { EVENT: "PUBLISH_STREAM", TYPE: "TASK" }, //no i18n

      UNPUBLISH_STREAM: { EVENT: "UNPUBLISH_STREAM", TYPE: "TASK" }, //no i18n

      PAUSE_STREAM: { EVENT: "PAUSE_STREAM", TYPE: "TASK" }, //no i18n

      START_STREAM: { EVENT: "START_STREAM", TYPE: "TASK" }, //no i18n

      SUBSCRIBE_TO_STREAM: { EVENT: "SUBSCRIBE_TO_STREAM", TYPE: "TASK" }, //no i18n

      UNSUBSCRIBE_TO_STREAM: { EVENT: "UNSUBSCRIBE_TO_STREAM", TYPE: "TASK" }, //no i18n

      AUDIO_PROPERTY_CHANGE: { EVENT: "AUDIO_PROPERTY_CHANGE", TYPE: "TASK" }, //no i18n

      VIDEO_PROPERTY_CHANGE: { EVENT: "VIDEO_PROPERTY_CHANGE", TYPE: "TASK" }, //no i18n

      BITRATE_CHANGE: { EVENT: "BITRATE_CHANGE", TYPE: "TASK" }, //no i18n

      SUBSTREAM_CHANGE: { EVENT: "SUBSTREAM_CHANGE", TYPE: "TASK" }, //simulcast //no i18n

      TEMPORAL_LAYER_CHANGE: { EVENT: "TEMPORAL_LAYER_CHANGE", TYPE: "TASK" }, //simulcast  //no i18n

      SWITCH_PUBLISHER_STREAM: {
        EVENT: "SWITCH_PUBLISHER_STREAM",
        TYPE: "TASK"
      }, //no i18n

      LEAVE_ROOM: { EVENT: "LEAVE_ROOM", TYPE: "TASK" }, //no i18n

      SDP_ANSWER: { EVENT: "SDP_ANSWER", TYPE: "WEBRTC" }, //no i18n

      SDP_OFFER: { EVENT: "SDP_OFFER", TYPE: "WEBRTC" }, //no i18n

      TRICKLE: { EVENT: "TRICKLE", TYPE: "WEBRTC" }, //no i18n

      TRICKLE_COMPLETED: { EVENT: "TRICKLE_COMPLETED", TYPE: "WEBRTC" }, //no i18n

      WEBRTC_UP: { EVENT: "WEBRTC_UP", TYPE: "WEBRTC" }, //no i18n

      HANG_UP: { EVENT: "HANG_UP", TYPE: "WEBRTC" }, //no i18n

      DESTROY_CONNECTION: { EVENT: "DESTROY_CONNECTION", TYPE: "TASK" }, //no i18n

      DETACH_PLUGIN: { EVENT: "DETACH_PLUGIN", TYPE: "TASK" }, //no i18n

      KEEP_CONNECTION_ALIVE: { EVENT: "KEEP_CONNECTION_ALIVE", TYPE: "TASK" } //no i18n
    }),

    EndPoints: Object.freeze({
      ROOM_ID: "roomId", //no i18n

      USER_ID: "userId", //no i18n

      GROUP_ID: "groupId", //no i18n

      server: "server" //no i18n
    }),

    MediaParams: Object.freeze({
      SESSION_ID: "sessionId", //no i18n

      HANDLE_ID: "handleId", //no i18n

      eventParams: {} //note that object key should be string,this field is just for ref
    }),

    ExchangeEndPointTypes: Object.freeze({
      SERVER: "SERVER", //no i18n

      USER: "USER" //no i18n
    }),

    Errors: Object.freeze({
      CREATE_CONNECTION: {
        type: "createConnection",
        message:
          "Invalid Connection from media server or the server may be down. Please try again later"
      }, //no i18n

      INIT_PLUGIN: {
        type: "initConference",
        message:
          "Error while creating a conference instance in the media server"
      }, //no i18n

      NEED_TO_INIT_PLUGIN: {
        type: "pluginInstanceNeeded",
        message:
          "Need to Init Plugin/Create an instance in MediaServer before requesting events"
      }, //no i18n

      MAP_ROOM_TO_PLUGIN_FAILED: {
        type: "mapRoomToPlugin",
        message: "Error While Attaching Room to Plugin"
      }, //no i18n

      PUBLISH_STREAM_FAILED: {
        type: "publishStream",
        message: "Error While Publishing Stream to Conf"
      }, //no i18n

      UNPUBLISH_STREAM_FAILED: {
        type: "unpublishStream",
        message: "Error While UnPublishing Stream"
      }, //no i18n

      CONNECTION_CLOSED: {
        type: "Publisher/Subscriber disconnected",
        message:
          "PeerConnection Closed by MediaServer for publisher/subscriber handle. Restart Connection if you want to publish/subscribe"
      }, //no i18n

      SUBSCRIBE_STREAM_FAILED: {
        type: "subscribeToStream",
        message: "Error While Subscribing Stream"
      }, //no i18n

      UNSUBSCRIBE_STREAM_FAILED: {
        type: "unsubscribeStream",
        message: "Error While UnSubscribing a Stream"
      }, //no i18n

      MEDIA_DEVICE_ABSENT: {
        type: "MediaCaptureDeviceError",
        message: "You do not have either media capture device."
      }, //no i18n

      AUDIO_DEVICE_ABSENT: {
        type: "MediaCaptureDeviceError",
        message: "You do not have a audio capture device."
      }, //no i18n

      VIDEO_DEVICE_ABSENT: {
        type: "MediaCaptureDeviceError",
        message: "You do not have a video capture device."
      }, //no i18n

      SCREEN_SHARE_FAILED: {
        type: "screenShareFailed",
        message: "Please try again after installing the screenshare plugin"
      } //no i18n
    }),

    init: function(roomId, serviceId) {
      if (roomId) {
        this.serviceId = serviceId ? serviceId : this.serviceId;
        this.roomId = roomId;
      }
    },

    _setObj: function(parentObj, key, value) {
      if (value) {
        parentObj[key] = value;
      }
      return parentObj;
    },

    isEmptyObject: function(objToVerify) {
      return (
        Object.keys(objToVerify).length === 0 &&
        objToVerify.constructor === Object
      );
    },

    generateTransactionId: function() {
      var length = 12;
      var chars =
        "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"; //no i18n
      var result = "";
      for (var i = length; i > 0; --i) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
      return result;
    },

    constructMediaEvent: function(event) {
      var _event = { event: event.EVENT };
      var eventType;

      if (event.TYPE === "MOD") {
        //no i18n
        eventType = { modEvent: _event };
      } else if (event.TYPE === "TASK") {
        //no i18n
        eventType = { taskEvent: _event };
      } else if (event.TYPE === "WEBRTC") {
        //no i18n
        eventType = { webrtcEvent: _event };
      }

      return eventType;
    },

    constructMessageEvent: function(event) {
      var _event = { event: event.EVENT };
      var eventType;

      if (event.TYPE === "MOD") {
        //no i18n
        eventType = { modEvent: _event };
      } else if (event.TYPE === "TASK") {
        //no i18n
        eventType = { taskEvent: _event };
      }

      return eventType;
    },

    constructEndPoints: function(parentObj, endPoints) {
      if (endPoints) {
        var relayEndpoints = {};
        relayEndpoints = this._setObj(
          relayEndpoints,
          "roomId",
          endPoints.roomId
        ); //no i18n
        relayEndpoints = this._setObj(
          relayEndpoints,
          "userId",
          endPoints.userId
        ); //no i18n
        relayEndpoints = this._setObj(
          relayEndpoints,
          "groupId",
          endPoints.groupId
        ); //no i18n
        relayEndpoints = this._setObj(
          relayEndpoints,
          "server",
          endPoints.server
        ); //no i18n
        if (!this.isEmptyObject(relayEndpoints)) {
          parentObj.relayEndpoints = relayEndpoints;
        }
      }

      return parentObj;
    },

    constructDataRelay: function(content, endPoints) {
      //have to throw error if there is no content
      if (endPoints) {
        var requestParams = {};
        if (content) {
          requestParams.content = content;
        }
        // var requestParams = {content:content,eventParams:eventParams};
        requestParams = this.constructEndPoints(requestParams, endPoints);
        return requestParams;
      }
      return undefined;
    },

    constructDataExchangeReq: function(
      reqContent,
      endPointType,
      exchangeEndPointId,
      ccResponseEndPoints
    ) {
      if (reqContent && endPointType) {
        var datex = { reqContent: reqContent, endPointType: endPointType }; //no i18n
        datex = this._setObj(datex, "exchangeEndPointId", exchangeEndPointId); //no i18n
        datex = this._setObj(datex, "ccResponse", ccResponseEndPoints); //no i18n
        return datex;
      }
      return undefined;
    },

    constructTransactionType: function(exchange, relay) {
      var transactionType = {};
      transactionType = this._setObj(transactionType, "exchange", exchange); //no i18n
      if (relay) {
        if (Array.isArray(relay)) {
          transactionType = this._setObj(transactionType, "relay", relay); //no i18n
        } else {
          transactionType = this._setObj(transactionType, "relay", [relay]); //no i18n
        }
      }
      return transactionType;
    },

    /*
            constructProcessingMode:function(sendToServer,sendToClient){

                     // Message have to be send to at least one endpoint [either to server or to a client]
                     var mode = {};
                     mode = this._setObj(mode,"sendToServer",sendToServer);
                     mode = this._setObj(mode,"sendToClient",sendToClient);
                    return mode;

            },
        */
    constructMessageRoute: function(eventType, data, eventParams) {
      if (eventType) {
        var processMessage = {
          eventType: this.constructMessageEvent(eventType)
        };
        processMessage = this._setObj(processMessage, "relay", data); //no i18n
        if (eventParams) {
          processMessage = this._setObj(
            processMessage,
            "eventParams",
            eventParams
          ); //no i18n
        }
        return processMessage;
      }
      //            else{
      //                //TODO: throw Error
      //            }
    },

    constructApplicationRoute: function(eventType, transactionType) {
      if (eventType && transactionType) {
        return { eventType: eventType, transactionType: transactionType };
      }
      return undefined;
    },

    constructMediaRoute: function(eventType, mediaParams, transactionType) {
      if (eventType && transactionType) {
        var processMedia = {
          eventType: this.constructMediaEvent(eventType),
          transactionType: transactionType
        };
        processMedia = this._setObj(processMedia, "requestParams", mediaParams); //no i18n
        return processMedia;
      }
      return undefined;
    },

    constructRequest: function(processAppEvent, processMedia, processMessage) {
      var request = {};
      request = this._setObj(request, "processAppEvent", processAppEvent); //no i18n
      request = this._setObj(request, "processMedia", processMedia); //no i18n
      request = this._setObj(request, "processMessage", processMessage); //no i18n
      return request;
    },

    constructCommunicationEvent: function(request, randomNumber) {
      var comEvent = { serviceId: this.serviceId, roomId: this.roomId };
      comEvent.request = request;
      if (randomNumber) {
        comEvent.info = {};
        comEvent.info.randomNumber = randomNumber;
      }
      //commEvent.transactionId = generateTransactionId(); Need to decide whether generating a randomId has any use
      return JSON.stringify(comEvent);
    }
  };

  /*

    Custom Implementation of Ajax in pure javascript

    */

  win.ajaxReq = function(url) {
    if (url) {
      this.init(url);
    }
    //    else{
    //        //TODO:  throw Error
    //    }
  };

  ajaxReq.prototype = {
    //TODO:  Change to JQuery AJAX if possible

    contentTypeHeader: "application/json;charset=UTF-8", //no i18n

    reqHeader: undefined,

    _url: undefined,

    init: function(url) {
      if (serverUrl) {
        this._url = serverUrl + url;
      } else {
        this._url = url;
      }
    },

    send: function(method, postBody, isSync) {
      var self = this;

      // Init http object
      var http = false;
      if (typeof ActiveXObject != "undefined") {
        try {
          http = new ActiveXObject("Msxml2.XMLHTTP");
        } catch (ex) {
          try {
            http = new ActiveXObject("Microsoft.XMLHTTP");
          } catch (ex2) {
            http = false;
          }
        }
      } else if (window.XMLHttpRequest) {
        try {
          http = new XMLHttpRequest();
        } catch (ex) {
          http = false;
        }
      }

      //              if (!http) {
      //                  // TODO: throw Error
      //              }

      //Checking whether CORS needed
      if (win.IS_CORS_REQ == true) {
        http.withCredentials = true;
      }

      //TODO: encode Post Data using encodeURIComponent
      http.onreadystatechange = function() {
        if (http.readyState == 4) {
          if (http.status == 200) {
            self.response.apply(self, [http.responseText]);
          } else {
            self.error.apply(self, [http.statusText]);
          }
        }
      };

      var method = method ? method : "GET"; //no i18n
      if (isSync) {
        http.open(method, this._url, false); //synchronous request
      } else {
        http.open(method, this._url, true); //asynchronous request
      }
      http.setRequestHeader("Content-type", this.contentTypeHeader);
      //http.setRequestHeader("Cookie","CS_userId=null;cs_uuk=null;");
      if (method === "POST" && postBody) {
        http.send(postBody);
      } else {
        http.send();
      }
      return false;
    },

    //callback events

    error: function(err) {},

    response: function(response) {}
  };

  win.reqResMap = function() {};

  reqResMap.prototype = {
    url: undefined,

    body: undefined,

    transactionId: undefined,

    requestEvent: undefined,

    responseText: undefined,

    content: undefined,

    Events: {
      onAck: function(data) {},

      onResponse: function(data) {},

      onError: function(error) {}
    }
  };

  /*

    Js Wrapper for communicating with Server

    */

  win.com_server = function() {};

  com_server.prototype = {
    cs_proto: undefined,

    serviceId: "ST", //no i18n

    roomId: undefined,

    userId: undefined,

    transactionReqMap: {},

    csConnection: undefined,

    no_of_eventsource_retries: 0,

    max_no_of_eventsource_retries: 10,

    alreadywarned: true,

    lastEventId: undefined,

    connection: undefined,

    users: [],

    mediaServerStatus: undefined,

    Events: {
      onInit: function(data) {},

      onConnect: function(data) {},

      onMessage: function(data) {},

      onRequest: function(data) {},

      onDisconnect: function(data) {},

      sseinitfailed: function(data) {},

      onJoinedRoom: function(data) {},

      onLeftRoom: function(data) {},

      onNewUser: function(user) {
        // this.users.push(user);
      },

      onMediaServerUp: function(resp) {},

      onMediaServerDown: function(resp) {}
    },

    Errors: {
      onError: function(error) {}
    },

    /*
        sendMessage:function(userId,message,receiversMap){
            var self = this;
            var reqResMap = new reqResMap();
            var url = "/msg/room/"+this.roomId+"/user/"+userId;
            reqResMap.url = url;
            if(postData){
                reqResMap.postData = postData;
            }

            var req = new ajaxReq(url);
            var postData  = this.getProtoForSendMessage(message,receiversMap)
            req.response = function(responseText){
                console.log("Response ",responseText);

                var response = JSON.parse(responseText);
                var transId = response.transactionId;
                self.transactionReqMap[transId] = reqResMap;
                reqResMap.onAck.apply(reqResMap,responseText);

            }

            req.error = function(error){
                console.log("Error ",error);
            }

            req.send("POST",postData);

            return reqResMap;
        },

        getProtoForSendMessage:function(postData,receiversMap){

            var cs_proto = this.cs_proto;
            if(!cs_proto){
                cs_proto = new CS_PROTO(this.roomId,this.serviceId);
                this.cs_proto = cs_proto;
            }

            var requestParams = cs_proto.constructBaseParams(postData,receiversMap.roomId,receiversMap.userId,receiversMap.groupId);
            var paramsArray = [requestParams]

            var message = cs_proto.constructMessageRoute(cs_proto.constructMessageEvent(cs_proto.MessageTaskEvents.SEND_MESSAGE),paramsArray,cs_proto.constructProcessingMode(true,true));
            var comEvent = cs_proto.constructCommunicationEvent(cs_proto.constructRequest(message));
            return comEvent;


        },
        */

    checkSSE_Enabled: function() {
      return !!win.EventSource;
    },

    checkRequirements: function() {
      var status = {
        requirementsVerified: false
      };

      if (checkSSE_Enabled()) {
        status.EventSourceEnabled = true;
        status.requirementsVerified = true;
      }

      return status;
    },

    eventSourceHandlers: function(connection, resolve, reject) {
      var self = this;
      //-1 is the transactionId sent in server to find status of janus
      function mediaServerStatus(e) {
        try {
          var response = e.detail;
          if (response == "MEDIA_SERVER_DOWN") {
            self.mediaServerStatus = "down"; //no i18n
            self.Events.onMediaServerDown.apply(self, [response]);
          } else if (response == "MEDIA_SERVER_UP") {
            //no i18n
            self.mediaServerStatus = "up"; //no i18n
            // self.Events.onMediaServerUp.apply(self,[response]);
          }
        } catch (e) {
          //                    console.log("e",e);
        }
      }
      document.addEventListener("-1", mediaServerStatus);
      connection.addEventListener(
        "Message",
        function(e) {
          //Any messages related to Communication Server
          media_channel.Debug.logConnection(
            "received at " + "Message" + " data->" + e.data
          ); //no i18n
          var responseEvent = JSON.parse(e.data);
          self.lastEventId = responseEvent.transactionId;
          if (responseEvent.messageEvent.taskEvent.event == "SEND_MESSAGE") {
            self.Events.onMessage.apply(self, [
              JSON.parse(responseEvent.responseString)
            ]); // TODO: Do proper syntax callback
            var responseString = JSON.parse(responseEvent.responseString);
          } else if (
            responseEvent.messageEvent.taskEvent.event == "JOINED_ROOM"
          ) {
            //no i18n
            var responseString = JSON.parse(responseEvent.responseString);
            var isExistingUser = self.users.find(function(_obj) {
              if (_obj && _obj.userId == responseString.user) {
                return _obj;
              }
            });
            if (isExistingUser) {
              isExistingUser.updateStatus(
                responseString.status,
                responseString.time
              );
            } else {
              var newUser = new z_user(
                responseString.user,
                responseString.appProperty,
                responseString.permissionProperties
              );
              self.Events.onNewUser.apply(self, [newUser]);
            }
            self.Events.onJoinedRoom.apply(self, [responseString]);
          } else if (
            responseEvent.messageEvent.taskEvent.event == "LEFT_ROOM"
          ) {
            //no i18n
            var responseString = JSON.parse(responseEvent.responseString);
            var isExistingUser = self.users.find(function(_obj) {
              if (_obj && _obj.userId == responseString.user) {
                return _obj;
              }
            });
            if (isExistingUser) {
              isExistingUser.updateStatus(
                responseString.status,
                responseString.time
              );
            } else {
              var newUser = new z_user(
                responseString.user,
                responseString.appProperty,
                responseString.permissionProperties
              );
              self.Events.onNewUser.apply(self, [newUser]);
            }
            self.Events.onLeftRoom.apply(self, [responseString]);
          } else if (
            responseEvent.messageEvent.taskEvent.event == "ANNOTATE_ACTION"
          ) {
            //no i18n
            if (whiteboard) {
              var responseString = JSON.parse(responseEvent.responseString);
              var eventParamsObj = JSON.parse(responseString.eventParams);
              win.manageAnnotationMessage(eventParamsObj, true, false);
            }
          }
        },
        false
      );

      connection.addEventListener(
        "Array",
        function(e) {
          //Any messages related to Communication Server
          media_channel.Debug.logConnection(
            "received at " + "Array" + " data->" + e.data
          ); //no i18n
          var responseEvent = JSON.parse(e.data);
          var responseStringObj = JSON.parse(responseEvent.responseString);
          responseStringObj.forEach(function(obj) {
            var objResponseString = JSON.parse(obj.responseString);
            if (obj.eventType == "MESSAGE_EVENT") {
              if (obj.messageEvent.taskEvent.event == "LEFT_ROOM") {
                var isExistingUser = self.users.find(function(_obj) {
                  if (_obj && _obj.userId == objResponseString.user) {
                    return _obj;
                  }
                });
                if (isExistingUser) {
                  isExistingUser.updateStatus(
                    objResponseString.status,
                    objResponseString.time
                  );
                } else {
                  var newUser = new z_user(
                    objResponseString.user,
                    objResponseString.appProperty,
                    objResponseString.permissionProperties
                  );
                  self.Events.onNewUser.apply(self, [newUser]);
                }
                self.Events.onLeftRoom.apply(self, [objResponseString]);
              } else if (obj.messageEvent.taskEvent.event == "JOINED_ROOM") {
                //no i18n
                var isExistingUser = self.users.find(function(_obj) {
                  if (_obj && _obj.userId == objResponseString.user) {
                    return _obj;
                  }
                });
                if (isExistingUser) {
                  isExistingUser.updateStatus(
                    objResponseString.status,
                    objResponseString.time
                  );
                } else {
                  var newUser = new z_user(
                    objResponseString.user,
                    objResponseString.appProperty,
                    objResponseString.permissionProperties
                  );
                  self.Events.onNewUser.apply(self, [newUser]);
                }
                self.Events.onJoinedRoom.apply(self, [objResponseString]);
              } else if (obj.messageEvent.taskEvent.event == "SEND_MESSAGE") {
                //no i18n
                self.Events.onMessage.apply(self, [objResponseString]); // TODO: Do proper syntax callback
              }
            }
          });
        },
        false
      );

      connection.addEventListener(
        "Room",
        function(e) {
          media_channel.Debug.logConnection(
            "received at " + "Room" + " data->" + e.data
          ); //no i18n
          try {
            if (e.data) {
              // response Event from server
              var responseEvent = JSON.parse(e.data);
              self.lastEventId = responseEvent.transactionId;
              if (responseEvent.status == "RELAY") {
                self.Events.onMessage.apply(self, [responseEvent]); // TODO: Do proper syntax callback
              } else {
                var reqRes =
                  self.transactionReqMap[responseEvent.transactionId];
                if (reqRes) {
                  if (responseEvent.status == "SUCCESS") {
                    reqRes.Events.onResponse.apply(
                      reqRes,
                      responseEvent.responseString
                    );
                  } else {
                    reqRes.Events.onError.apply(reqRes, [responseEvent.error]);
                  }
                  delete self.transactionReqMap[responseEvent.transactionId];
                } else {
                  self.Events.onMessage.apply(self, [responseEvent]); // TODO: Do proper syntax callback
                }
              }
            } else if (e.request) {
              //  Request from Server or an User
              var requestEvent = JSON.parse(e.request);
              var appReq = requestEvent.request.processAppEvent;

              var req = new reqResMap();
              var reqEventMap = {};
              reqEventMap.eventType = appReq.appEventType;
              reqEventMap.requestText =
                appReq.transactionType.exchange.reqContent;
              req.requestEvent = reqEventMap;

              self.transactionReqMap[requestEvent.transactionId] = requestEvent;
              self.Events.onRequest.apply(self, [req]); // TODO: Do proper syntax callback
            }
          } catch (e) {
            //TODO: log and send event to monitoring server as Error
          }
        },
        false
      );

      connection.addEventListener(
        "Media",
        function(e) {
          //Any messages related to MediaServer
          media_channel.Debug.logConnection(
            "received at " + "Media" + " data->" + e.data
          ); //no i18n
          try {
            if (e.data) {
              // response Event from server

              var responseEvent = JSON.parse(e.data);
              self.lastEventId = responseEvent.transactionId;
              // console.log("reponseEvent--->",responseEvent);
              if (responseEvent.status == "RELAY") {
                // messages come under the listener "Message"
                // self.Events.onMessage.apply(self,[responseEvent]);  // TODO: Do proper syntax callback
                if (
                  responseEvent.mediaEvent != null &&
                  responseEvent.mediaEvent.taskEvent != null &&
                  responseEvent.mediaEvent.taskEvent.event != null &&
                  responseEvent.mediaEvent.taskEvent.event == "CLOSE_SSE"
                ) {
                  med_ch.destroyAllHandlesFollowedBySession(true);
                  connection.close();
                }
              } else {
                var reqRes =
                  self.transactionReqMap[responseEvent.transactionId];
                if (reqRes) {
                  if (responseEvent.status == "SUCCESS") {
                    //create_session
                    //init_videoroom for conf obj/publisher/subscriber
                    //map_room_plugin for conf obj/publisher/subscriber
                    //publishing_stream
                    //subscribing_stream
                    //unpublishing_stream
                    //unsubscribing_stream
                    var event = new CustomEvent(responseEvent.transactionId, {
                      detail: responseEvent.responseString
                    }); //no i18n
                    document.dispatchEvent(event);
                    //  reqRes.Events.onResponse.apply(reqRes,[responseEvent.responseString]);
                  } else {
                    reqRes.Events.onError.apply(reqRes, [responseEvent.error]);
                  }
                  delete self.transactionReqMap[responseEvent.transactionId];
                } else {
                  //fallback: case=>ack received after connection msg received
                  if (
                    responseEvent.mediaEvent != null &&
                    responseEvent.mediaEvent.taskEvent != null &&
                    (responseEvent.mediaEvent.taskEvent.event ==
                      "MEDIA_SERVER_UP" ||
                      responseEvent.mediaEvent.taskEvent.event ==
                        "MEDIA_SERVER_DOWN")
                  ) {
                    var event = new CustomEvent(responseEvent.transactionId, {
                      detail: responseEvent.mediaEvent.taskEvent.event
                    }); //no i18n
                    document.dispatchEvent(event);
                  } else {
                    var resObj = {
                      transactionId: responseEvent.transactionId,
                      detail: responseEvent.responseString
                    };
                    media_channel.messages_without_ack.push(resObj); // delete the later entry in map
                  }
                  // self.Events.onMessage.apply(self,[responseEvent]);  // TODO: Do proper syntax callback
                }
              }
            } else if (e.request) {
              //  Request from Server or an User
              var requestEvent = JSON.parse(e.request);
              var appReq = requestEvent.request.processAppEvent;

              var req = new reqResMap();
              var reqEventMap = {};
              reqEventMap.eventType = appReq.appEventType;
              reqEventMap.requestText =
                appReq.transactionType.exchange.reqContent;
              req.requestEvent = reqEventMap;

              self.transactionReqMap[requestEvent.transactionId] = requestEvent;
              self.Events.onRequest.apply(self, [req]); // TODO: Do proper syntax callback
            }
          } catch (error) {
            //                    console.log("error",error);
          }
        },
        false
      );

      connection.addEventListener(
        "open",
        function(e) {
          media_channel.Debug.logConnection(
            "received at " + "open" + " data->" + e.data
          ); //no i18n
          self.no_of_eventsource_retries = 0;
          self.alreadywarned = true;
          self.Events.onConnect.apply(self, [e]); // TODO: Do proper syntax callback
          // Connection was opened.
        },
        false
      );
      connection.addEventListener(
        "error",
        function(e) {
          media_channel.Debug.logConnection(
            "received at " + "error" + " data->" + e.data
          ); //no i18n
          // if (e.readyState == EventSource.CLOSED) {
          // Connection was closed.
          if (med_ch && med_ch.media_conference) {
            for (var k in med_ch.media_conference.subscriberHandles) {
              var thisSubscriberHandle =
                med_ch.media_conference.subscriberHandles[k];
              if (!thisSubscriberHandle.isStreamDestroyed) {
                med_ch.media_conference.Events.onStreamDestroyed.apply(
                  thisSubscriberHandle,
                  [thisSubscriberHandle]
                ); //this event is applied before callback because,
                var failure = {
                  handle: thisSubscriberHandle,
                  reason: "networkFailed" //no i18n
                };
                thisSubscriberHandle.Events.onFailure.apply(
                  thisSubscriberHandle,
                  [failure]
                );
              }
              // no callback will be sent after the connection is destroyed
            }
            for (var k in med_ch.media_conference.pubHandles) {
              var thisHandle = med_ch.media_conference.pubHandles[k];
              // thisHandle.closeMyPeerConnection(thisHandle);
              if (!thisHandle.isStreamDestroyed) {
                med_ch.media_conference.Events.onStreamDestroyed.apply(
                  thisHandle,
                  [thisHandle]
                );
                var failure = {
                  handle: thisHandle,
                  reason: "networkFailed" //no i18n
                };
                thisHandle.Events.onFailure.apply(thisHandle, [failure]);
              }
            }
          }

          var no_of_eventsource_retries = self.no_of_eventsource_retries;
          self.no_of_eventsource_retries = no_of_eventsource_retries + 1;
          if (
            self.no_of_eventsource_retries <= self.max_no_of_eventsource_retries
          ) {
            reject(e);
          } else {
            if (self.alreadywarned) {
              self.alreadywarned = false;
              self.Events.sseinitfailed.apply(self, [self]);
              connection.close();
            }
          }
          // self.Events.onDisconnect.apply(self,[e]); // TODO: Do proper syntax callback
          // }
        },
        false
      );

      this.csConnection = connection;
    },

    handleMediaResponse: function(responseEvent, reqRes) {
      if (responseEvent.status == "SUCCESS") {
        reqRes.Events.onResponse.apply(reqRes, [responseEvent.responseString]);
      } else {
        reqRes.Events.onError.apply(reqRes, [responseEvent.error]);
      }
    },

    setCookie: function(name, value) {
      document.cookie = name + "=" + value;
    },

    init: function(roomId, serviceId) {
      if (roomId) {
        this.serviceId = serviceId ? serviceId : this.serviceId;
        this.roomId = roomId;
        var cookieValue = roomId + "-" + userId;
        this.setCookie("CS_userId", cookieValue); //no i18n
        this.cs_proto = new CS_PROTO(roomId, serviceId);
        this.Events.onInit.apply(this, [
          { roomId: roomId, serviceId: serviceId }
        ]);
      }
      //        else{
      //                //TODO:throw Error
      //        }
    },
    connect: function(userId) {
      var self = this;
      var promise = new Promise(function(resolve, reject) {
        self.userId = userId;

        if (self.checkSSE_Enabled()) {
          var withCredentials;
          if (win.IS_CORS_REQ == true) {
            withCredentials = { withCredentials: true };
          } else {
            withCredentials = { withCredentials: false };
          }
          var sseUrl;
          //to monitoring server
          var dataObjActionSegment = win.constructActionSegment(
            "CREATE_SSE_CONNECTION",
            1,
            new Date().getTime(),
            JSON.stringify({ source: "FromClientToMS" })
          ); //no i18n
          var relationalIds = [];
          relationalIds.push(parseInt(roomId), parseInt(userId));
          var dataObjAction = win.constructAction(
            dataObjActionSegment,
            relationalIds
          );
          var moduleAS = win.constructModuleAS(
            roomId,
            "CREATE_SSE_CONNECTION",
            dataObjAction
          ); //no i18n
          window.pushModuleAS(moduleAS);

          if (serverUrl) {
            sseUrl =
              serverUrl +
              "/sse/service/" +
              self.serviceId +
              "/room/" +
              self.roomId +
              "/user/" +
              userId; //no i18n
          } else {
            sseUrl =
              "/sse/service/" +
              self.serviceId +
              "/room/" +
              self.roomId +
              "/user/" +
              userId; //no i18n
          }
          if (self.lastEventId) {
            sseUrl = sseUrl + "?eventId=" + self.lastEventId; //no i18n
          }
          try {
            setTimeout(function() {
              self.connection = new EventSource(sseUrl, withCredentials);
              self.eventSourceHandlers(self.connection, resolve, reject);
            }, 1000);
          } catch (error) {
            //                        console.log("error in creating",error);
          }

          // reject("hi");
        }
      });

      promise.then(
        function(response) {
          var e = response;
          //to monitoring server
          var dataObjActionSegment = win.constructActionSegment(
            "CREATE_SSE_CONNECTION",
            3,
            new Date().getTime(),
            JSON.stringify({ source: "FromMSToClient", response: response })
          ); //no i18n
          var relationalIds = [];
          relationalIds.push(parseInt(roomId), parseInt(userId));
          var dataObjAction = win.constructAction(
            dataObjActionSegment,
            relationalIds
          );
          var moduleAS = win.constructModuleAS(
            roomId,
            "CREATE_SSE_CONNECTION",
            dataObjAction
          ); //no i18n
          window.pushModuleAS(moduleAS);
          self.Events.onConnect.apply(self, [e]); // TODO: Do proper syntax callback
        },
        function(error) {
          var error = error;
          var connection = error.target;
          if (connection) {
            connection.close();
          }
          self.Events.onDisconnect.apply(self, [error]);
        }
      );

      //        else{
      //            // TODO: throw Error
      //        }
    },

    getProtoForSendReq: function(
      eventPipeLine,
      eventType,
      reqContent,
      endPointType,
      endpointId,
      mediaParams,
      randomNumber
    ) {
      var cs_proto = this.cs_proto;
      if (!cs_proto) {
        cs_proto = new CS_PROTO(this.roomId, this.serviceId);
        this.cs_proto = cs_proto;
      }
      var transactionType = cs_proto.constructTransactionType(
        cs_proto.constructDataExchangeReq(reqContent, endPointType, endpointId)
      );

      var reqMsg;
      if (eventPipeLine === "Media") {
        //no i18n
        var mediaRoute = cs_proto.constructMediaRoute(
          eventType,
          mediaParams,
          transactionType
        );
        reqMsg = cs_proto.constructRequest(undefined, mediaRoute);
      }
      //        else if(eventPipeLine === "Message"){ //no i18n
      //                //Since Message Route has only relay Feature, it was implemented not here but in sendMessage function
      //        }
      else if (eventPipeLine === "Application" || !eventPipeLine) {
        //no i18n
        var appRoute = cs_proto.constructApplicationRoute(
          eventType,
          transactionType
        );
        reqMsg = cs_proto.constructRequest(appRoute);
      }
      var comEvent = cs_proto.constructCommunicationEvent(reqMsg, randomNumber);
      return comEvent;
    },
    documentEventListeners: [],
    // removeListener:function(target,lisenterid,isDocument){
    //     var self = this;
    //         setTimeout(function() {
    //             if(isDocument){
    //                 if(document.removeEventListener){
    //                     document.removeEventListener(lisenterid,function(){});
    //                 }else if(document.detachEvent){
    //                     document.detachEvent(lisenterid,function(){});
    //                 }
    //             }
    //             self.documentEventListeners.splice(self.documentEventListeners.indexOf(lisenterid));
    //         },1000);
    // },
    generateRandomNumber: function(reqContent, onlyString) {
      if (onlyString) {
        if (reqContent) {
          return reqContent;
        }
        //                else{
        //                    //todo: not a valid case
        //                }
      } else {
        var randomNumber = Math.floor(Math.random() * 90000) + 10000;
        var i = 1;
        var noOfTries = 0;
        while (i == 1) {
          if (noOfTries > 1000) {
            //todo throw error:- failed to generate random number
            i = 2;
          }
          if (reqContent) {
            var reqContentString = reqContent.toString();
            if (
              this.documentEventListeners.indexOf(
                reqContentString + "_ack_" + randomNumber.toString()
              ) == -1
            ) {
              this.documentEventListeners.push(
                reqContentString + "_ack_" + randomNumber.toString()
              );
            } else {
              i = 2;
            }
          } else {
            if (
              this.documentEventListeners.indexOf(randomNumber.toString()) == -1
            ) {
              this.documentEventListeners.push(randomNumber.toString());
            } else {
              i = 2;
            }
          }
          noOfTries++;
        }
        return randomNumber;
      }
    },
    createModuleASAndSend: function(moduleId, actionKey, action, updateKeys) {
      try {
        var obj = {};
        obj.action = {};
        if (moduleId) {
          obj.moduleId = moduleId;
          obj.action[actionKey] = action;
          if (updateKeys) {
            obj.keys = updateKeys;
          }
        }
      } catch (e) {
        //                console.log("e",e);
      }
      // console.log("obj",obj);
      //to monitoring server
      if (toMonitoringServer) {
        var url = "https://manoharan-1413.csez.zohocorpin.com:8443/monitoring"; //No i18n
        var req = new ajaxReq(url);
        var moduleData = { moduleas: obj };
        req.send("POST", JSON.stringify(moduleData)); //No i18n
      }
    },
    createAction: function(actionArr, relationalIdsArr) {
      try {
        var action = {};
        if (actionArr && actionArr.length > 0) {
          action.actions = actionArr;
          if (relationalIdsArr && relationalIdsArr.length > 0) {
            action.relationalIds = relationalIdsArr;
          }
        }
        return action;
      } catch (e) {}
    },
    createActionSegment: function(name, state, time, info) {
      try {
        var actionSegment = {};
        if (name) {
          actionSegment.name = name;
          if (state) {
            actionSegment.state = state;
          }
          if (time) {
            actionSegment.time = time;
          }
          if (info) {
            actionSegment.info = JSON.stringify(info);
          }
        }
        var actionSegemntArr = [];
        actionSegemntArr.push(actionSegment);
        return actionSegemntArr;
      } catch (e) {}
    },
    sendReq: function(
      eventType,
      reqContent,
      endPointType,
      endpointId,
      eventPipeLine,
      mediaParams,
      randomNumber,
      sync
    ) {
      var self = this;
      var url = "/msg/room/" + this.roomId + "/user/" + userId; //no i18n
      var reqRes = new reqResMap();
      reqRes.url = url;
      reqRes.content = reqContent; //+randomNumber.toString();
      if (postData) {
        reqRes.postData = postData;
      }

      var req = new ajaxReq(url);
      var postData = this.getProtoForSendReq(
        eventPipeLine,
        eventType,
        reqContent,
        endPointType,
        endpointId,
        mediaParams,
        randomNumber
      );

      req.response = function(responseText) {
        try {
          var response = JSON.parse(responseText);
          var transId = response.transactionId;
          if (response.status == "ACK" || !response.status) {
            //todo:-check messageswithoutack object before adding to map

            self.transactionReqMap[transId] = reqRes;
            // if(reqRes.content.indexOf("init_videoroom_plugin_publisher") || reqRes.content.indexOf("init_videoroom_plugin_subscriber") || reqRes.content.indexOf("init_videoroom_plugin") || reqRes.content.indexOf("map_room_to_plugin/join_a_room_in_plugin") || reqRes.content.indexOf("map_room_to_plugin/join_a_room_in_plugin_for_publisher") || reqRes.content.indexOf("map_room_to_plugin/join_a_room_in_plugin_for_subscriber") || reqRes.content.indexOf("create_session") || reqRes.content.indexOf("publishing_stream") || reqRes.content.indexOf("unpublishing_stream") || reqRes.content.indexOf("unsubscribing_stream") || reqRes.content.indexOf("detach_plugin")){
            var event = new CustomEvent(reqRes.content + "_ack", {
              detail: responseText
            }); //no i18n
            if (randomNumber) {
              //init_videoroom_plugin
              //init_videoroom_plugin_publisher
              //init_videoroom_plugin_subscriber
              //map_room_to_plugin
              //map_room_to_plugin_subscriber
              //map_room_to_plugin_publisher
              //create_session
              //publishing_stream
              //unpublishing_stream
              //subscribing_stream
              //unsubscribing_stream
              //detach_plugin
              event = new CustomEvent(
                reqRes.content + "_ack_" + randomNumber.toString(),
                { detail: responseText }
              ); //no i18n
            }
            document.dispatchEvent(event);
            // }
            // else{
            //     reqRes.Events.onAck.apply(reqRes,[responseText]);
            // }
          } else {
            reqRes.Events.onError.apply(reqRes, [responseEvent.error]);
          }
        } catch (e) {
          reqRes.Events.onError.apply(reqRes, ["Invalid Response"]);
        }
      };

      req.error = function(error) {
        reqRes.Events.onError.apply(reqRes, [error]);
      };

      req.send("POST", postData, sync); //no i18n

      return reqRes;
    },

    getProtoForSendMessage: function(
      eventType,
      message,
      relayEndpoints,
      eventPipeLine,
      mediaParams
    ) {
      var cs_proto = this.cs_proto;
      if (!cs_proto) {
        cs_proto = new CS_PROTO(this.roomId, this.serviceId);
        this.cs_proto = cs_proto;
      }
      var reqMsg;

      if (eventPipeLine === "Message") {
        //TODO: Message Event Should be Implemented
        var messageRoute = cs_proto.constructMessageRoute(
          eventType,
          cs_proto.constructDataRelay(message, relayEndpoints),
          mediaParams
        );
        reqMsg = cs_proto.constructRequest(undefined, undefined, messageRoute);
      } else {
        var transactionType = cs_proto.constructTransactionType(
          undefined,
          cs_proto.constructDataRelay(message, relayEndpoints)
        );
        if (eventPipeLine === "Media") {
          //no i18n
          var mediaRoute = cs_proto.constructMediaRoute(
            eventType,
            mediaParams,
            transactionType
          );
          reqMsg = cs_proto.constructRequest(undefined, mediaRoute);
        } else if (eventPipeLine === "Application" || !eventPipeLine) {
          //no i18n
          var appRoute = cs_proto.constructApplicationRoute(
            eventType,
            transactionType
          );
          reqMsg = cs_proto.constructRequest(appRoute);
        }
      }

      var comEvent = cs_proto.constructCommunicationEvent(reqMsg);
      return comEvent;
    },

    sendMessage: function(
      userId,
      eventType,
      message,
      relayEndpoints,
      eventPipeLine,
      mediaParams
    ) {
      var self = this;
      var url = "/msg/room/" + this.roomId + "/user/" + userId; //no i18n
      var reqRes = new reqResMap();
      reqRes.url = url;
      if (postData) {
        reqRes.postData = postData;
      }
      var req = new ajaxReq(url);
      var postData = this.getProtoForSendMessage(
        eventType,
        message,
        relayEndpoints,
        eventPipeLine,
        mediaParams
      );
      req.response = function(responseText) {
        try {
          var response = JSON.parse(responseText);
          var transId = response.transactionId;
          if (response.status == "ACK" || !response.status) {
            self.transactionReqMap[transId] = reqRes;
            reqRes.Events.onAck.apply(reqRes, [responseText]);
          } else {
            reqRes.Events.onError.apply(reqRes, [responseEvent.error]);
          }
        } catch (e) {
          reqRes.Events.onError.apply(reqRes, ["Invalid Response"]);
        }
      };

      req.error = function(error) {
        reqRes.Events.onError.apply(reqRes, [error]);
      };
      req.send("POST", postData); //no i18n

      return reqRes;
    },

    sendResponse: function(req, isError) {
      var reqEvent = self.transactionReqMap[req.transactionId];
      if (reqEvent && req.responseText) {
        reqEvent.request.processAppEvent.transactionType.exchange.resContent =
          req.responseText;
        if (isError) {
          reqEvent.request.processAppEvent.transactionType.exchange.isError = isError;
        }

        var self = this;
        var userId =
          reqEvent.request.processAppEvent.transactionType.exchange
            .exchangeEndPointId;
        var url = "/msg/room/" + this.roomId + "/user/" + userId; //no i18n
        var reqRes = new reqResMap();
        reqRes.url = url;
        if (postData) {
          reqRes.reqEvent = reqEvent;
        }

        var req = new ajaxReq(url);
        var postData = JSON.stringify(reqEvent);
        req.response = function(responseText) {
          try {
            var response = JSON.parse(responseText);
            if (response.status == "ACK" || !response.status) {
              reqRes.Events.onAck.apply(reqRes, [responseText]);
            } else {
              reqRes.Events.onError.apply(reqRes, [responseEvent.error]);
            }
          } catch (e) {
            reqRes.Events.onError.apply(reqRes, ["Invalid Response"]);
          }
        };

        req.error = function(error) {
          reqRes.Events.onError.apply(reqRes, [error]);
        };

        req.send("POST", postData); //no i18n

        return reqRes;
      }
    }
  };
})(window);
