(function(win) {
  //supportive functions
  win.notifyMe = function(title, message) {
    if (enableNotifications) {
      let hidden = 'hidden'; //no i18n
      // Standards:
      //            if (hidden in document){
      //                // document.addEventListener("visibilitychange", handle.visibilityDetector);
      //            }
      if ((hidden = 'mozHidden') in document) {
        hidden = 'mozHidden'; //no i18n
      } else if ((hidden = 'webkitHidden') in document) {
        hidden = 'webkitHidden'; //no i18n
      } else if ((hidden = 'msHidden') in document) {
        hidden = 'msHidden'; //no i18n
      }
      // IE 9 and lower:
      // else if ("onfocusin" in document){
      //     // document.onfocusin = document.onfocusout = handle.visibilityDetector;
      // }
      // // All others:
      // else{
      //     // window.onpageshow = window.onpagehide = window.onfocus = window.onblur = handle.visibilityDetector;
      // }
      //first time only
      if (document[hidden] !== undefined) {
        let state = document[hidden] ? 'hidden' : 'visible'; //no i18n
        if (state == 'hidden') {
          if (Notification.permission !== 'granted') {
            Notification.requestPermission();
          } else {
            let notification = new Notification(title, {
              icon: '/images/showtime-circle.png', //no i18n
              body: message
            });

            notification.onclick = function() {
              window.focus();
              this.close();
            };
          }
        }
      }
    }
  };

  win.textify = function(str) {
    let temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  };

  win.createNewPublisher = function() {
    rePublish(1);
    document
      .getElementById('user-form')
      .setAttribute('onsubmit', 'return sendUserCreate()');
    return false;
  };

  win.detachrePublish = function(source, id) {
    try {
      let pluginId = id.substring(0, id.indexOf('-'));
      media_channel.allHandles.find(handle => {
        //possible two publishers(a/v or screenshare)
        if (handle.pluginId == pluginId) {
          handle.detachHandle();
          if (handle.source == 1) {
            getInitalScreen(false, false, true);
            document
              .getElementById('user-form')
              .setAttribute('onsubmit', 'return createNewPublisher()');
            changeDevice(`${pluginId}-`);
          } else if (handle.source == 2) {
            rePublish(2);
          }
        }
      });
    } catch (err) {
      //            console.log("err",err);
    }
    closeAlertModal();
  };
  win.reDirectToExtensionPage = function() {
    let aTag = document.createElement('a');
    aTag.href = screensShareExtensionLink;
    aTag.target = '_blank';
    aTag.id = 'temp-a';
    aTag.setAttribute('onClick', 'closeAlertModal()');
    aTag.click();
    // window.location.href = screensShareExtensionLink;
  };
  win.rePublish = function(source) {
    if (source == 1) {
      initPublishers();
    } else if (source == 2) {
      createNewScreenSharePublihser();
    }
    closeAlertModal();
  };

  win.debounced = function(delay, fn) {
    let timerId;
    return function(...args) {
      if (timerId) {
        clearTimeout(timerId);
      }
      timerId = setTimeout(() => {
        fn(...args);
        timerId = null;
      }, delay);
    };
  };

  win.viewThisTab = function(type) {
    let tabs = ['attendees', 'chats', 'invite-attendees']; //no i18n
    let clone = ['attendees', 'chats', 'invite-attendees']; //no i18n
    clone.splice(type, 1);
    clone.forEach(tab => {
      if (
        document.getElementById(tab) &&
        document.getElementById(tab).className.indexOf('active') != -1
      ) {
        document.getElementById(tab).classList.remove('active'); //no i18n
      }
    });
    if (
      document.getElementById(tabs[type]) &&
      document.getElementById(tabs[type]).className.indexOf('active') == -1
    ) {
      document.getElementById(tabs[type]).className += ' active';
      if (type == 2) {
        document.getElementById('join-link').innerHTML = textify(
          `${location.protocol}//${location.host}${location.pathname}`
        );
        //                    document.getElementById("join-link").href=location.protocol + '//' + location.host + location.pathname
      }
      document.getElementById(`pulse-${type}`).className = '';
    }
  };

  win.closeSideTab = function(type) {
    let tabs = ['attendees', 'chats', 'invite-attendees']; //no i18n
    if (document.getElementById(tabs[type])) {
      document.getElementById(tabs[type]).classList.remove('active');
    }
    if (document.getElementById(`tab-${type}`)) {
      document.getElementById(`tab-${type}`).classList.remove('active'); //no i18n
    }
  };

  win.resize = function() {
    setTimeout(() => {
      if (whiteboard && annotators.length > 0) {
        annotators.forEach(z_annotator => {
          z_annotator._resize(z_annotator);
        });
      }
    }, 1000);
    if (layout && layout != undefined) {
      debounced(500, layout.layout());
    }
  };

  win.setAudioVideoParams = function(resolve, reject) {
    let audioSelect = document.getElementById('audio-select');
    let audioSelectedValue = 'none'; //no i18n
    if (audioSelect) {
      audioSelectedValue = audioSelect.value;
    }
    let videoSelect = document.getElementById('video-select');
    let videoSelectedValue = 'none'; //no i18n
    if (videoSelect) {
      videoSelectedValue = videoSelect.value;
    }
    let audioInURL = decodeURIComponent(
      window.location.search.replace(
        new RegExp(
          `^(?:.*[&\\?]${encodeURIComponent('audio').replace(
            /[\.\+\*]/g,
            '\\$&'
          )}(?:\\=([^&]*))?)?.*$`,
          'i'
        ),
        '$1'
      )
    );
    let videoInURL = decodeURIComponent(
      window.location.search.replace(
        new RegExp(
          `^(?:.*[&\\?]${encodeURIComponent('video').replace(
            /[\.\+\*]/g,
            '\\$&'
          )}(?:\\=([^&]*))?)?.*$`,
          'i'
        ),
        '$1'
      )
    );
    if (audioSelectedValue == 'none' && videoSelectedValue == 'none') {
      let audioEl = audioInURL;
      if (audioInURL == 'none') {
        audioEl = 'none-audio'; //no i18n
      }
      let videoEl = videoInURL;
      if (videoInURL == 'none') {
        videoEl = 'none-audio'; //no i18n
      }
      if (document.getElementById(audioEl)) {
        document.getElementById(audioEl).selected = true;
      }
      if (document.getElementById(videoEl)) {
        document.getElementById(videoEl).selected = true;
      }
      if (!subscriberOnly) {
        let messageObj = {};
        messageObj.title = 'Oops!'; //no i18n
        messageObj.content = 'Choose Atleast one'; //no i18n
        openModalDialog('error', messageObj); //no i18n
        if (reject) {
          reject();
        }
        return;
      }
    }
    let audioAction;
    let videoAction;
    if (audioInURL == 'none') {
      audioAction = 1;
    } else if (audioSelectedValue == 'none') {
      //no i18n
      audioAction = 3;
    } else {
      audioAction = 2;
    }
    if (videoInURL == 'none') {
      videoAction = 1;
    } else if (videoSelectedValue == 'none') {
      //no i18n
      videoAction = 3;
    } else {
      videoAction = 2;
    }
    let audioChanged = false;
    let videoChanged = false;
    if (audioInURL != audioSelectedValue) {
      audioChanged = true;
    }
    if (videoInURL != videoSelectedValue) {
      videoChanged = true;
    }
    //            window.location.search +="video" + "=" + videoSelectedValue+"&audio="+audioSelectedValue;
    let newURL =
      `${location.protocol}//${location.host}${location.pathname}?` +
      'video' +
      `=${videoSelectedValue}&audio=${audioSelectedValue}`;
    if (doSimulcast) {
      newURL += '&simulcast=true'; //no i18n
    }
    if (isDeveloper) {
      newURL += '&developer=true'; //no i18n
    }
    window.history.pushState('', '', newURL);
    if (resolve) {
      resolve({
        videoChanged: videoChanged,
        audioChanged: audioChanged,
        audioAction: audioAction,
        videoAction: videoAction,
        audioSelectedValue: audioSelectedValue,
        videoSelectedValue: videoSelectedValue
      });
    }
  };

  win.checkAndScroll = function(userAction) {
    let el = document.getElementById('tab-1');
    let objDiv = document.getElementById('add-chat-here');
    if ((el && !el.classList.contains('active')) || userAction) {
      objDiv.scrollTop = objDiv.scrollHeight;
      var chatscroll = document.getElementById('scroll-down-1');
      if (chatscroll && !chatscroll.classList.contains('d-none')) {
        chatscroll.classList.add('d-none'); //no i18n
      }
    } else if (el && el.classList.contains('active') && !userAction) {
      //no i18n
      //todo:- "scroll down to see new messages"
      var chatscroll = document.getElementById('scroll-down-1');
      if (chatscroll) {
        chatscroll.classList.remove('d-none'); //no i18n
      }
    }
  };

  win.scrollDown = function() {
    let objDiv = document.getElementById('add-chat-here');
    objDiv.scrollTop = objDiv.scrollHeight;
    let chatscroll = document.getElementById('scroll-down-1');
    if (chatscroll) {
      chatscroll.classList.add('d-none'); //no i18n
    }
  };

  win.addPulseToColumn = function(type) {
    let tabs = ['attendees', 'chats']; //no i18n
    let element = document.getElementById(`tab-${type}`);
    if (element && !element.classList.contains('active')) {
      let pulse = document.getElementById(`pulse-${type}`);
      if (pulse) {
        pulse.className +=
          'notification-count notification-member notify-mic-request'; //no i18n
      }
    }
  };

  win.copyLink = function() {
    let el = document.createElement('textarea');
    // Set value (string to be copied)
    el.value = `${location.protocol}//${location.host}${location.pathname}`;
    // Set non-editable to avoid focus and move outside of view
    el.setAttribute('readonly', '');
    el.style = { position: 'absolute', left: '-9999px' };
    document.body.appendChild(el);
    // Select text inside element
    el.select();
    // Copy text to clipboard
    document.execCommand('copy'); //no i18n
    // Remove temporary element
    document.body.removeChild(el);
    let textel = document.getElementById('copy-me');
    textel.innerHTML = 'Copied'; //no i18n
    setTimeout(() => {
      textel.innerHTML = 'Copy'; //no i18n
    }, 2000);
  };

  win.exit = function(isRedirect) {
    let req = new ajaxReq(`/roomaction/${roomId}/user/delete/${userId}`); //no i18n
    req.response = function(response) {
      if (response) {
        let add = false;
      }
    };
    req.error = function(error) {};
    let comEvent = {};
    req.send('POST', comEvent, true); //no i18n
    if (isRedirect) {
      window.open(`${location.protocol}//${location.host}`, '_self');
    }
  };

  win.openFullscreen = function(id_fullscreen) {
    let id = id_fullscreen.substring(0, id_fullscreen.indexOf('-'));
    let elId = id;
    let handle;
    media_channel.allHandles.find(_handle => {
      //possible two publishers(a/v or screenshare)
      if (_handle.pluginId == elId) {
        handle = _handle;
      }
    });
    let elem = document.getElementById(elId);
    let isFullScreen = false;
    if (document.fullscreenElement) {
      isFullScreen = true;
    } else if (document.webkitFullscreenElement) {
      isFullScreen = true;
    } else if (document.mozFullScreenElement) {
      isFullScreen = true;
    }
    let iconElement = document.getElementById(id_fullscreen);
    if (!isFullScreen) {
      let _promise = new Promise((resolve, reject) => {
        if (elem.requestFullscreen) {
          elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          /* Firefox */
          elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) {
          /* Chrome, Safari & Opera */
          elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
          /* IE/Edge */
          elem.msRequestFullscreen();
        }
        if (document.getElementById(`canvas-${elId}`)) {
          document.getElementById(`canvas-${elId}`).style.width = 'auto';
        }
        iconElement.innerHTML =
          '<svg>\n' + '<use xlink:href="#minimize-icon"></use>\n' + '</svg>'; //no i18n
        resolve();
      });
      _promise.then(() => {
        // handle.confInstance.fullScreenInProgress = true;
      });
    } else {
      let promise = new Promise((resolve, reject) => {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
        if (document.getElementById(`canvas-${elId}`)) {
          document.getElementById(`canvas-${elId}`).style.width = '100%';
        }
        iconElement.innerHTML =
          '<svg>\n' + '<use xlink:href="#maximize-icon"></use>\n' + '</svg>'; //no i18n
        resolve();
      });
      promise.then(() => {
        // handle.confInstance.fullScreenInProgress = true;
      });
    }
  };

  win.getInitalScreen = function(isIndex, reEnumerate, generatePreview) {
    let audioInputDevices = [];
    let videoInputDevices = [];
    let audioExist = false;
    let videoExist = false;
    let gumConstraints = {
      audio: audioExist,
      video: videoExist
    };
    if (!subscriberOnly) {
      navigator.mediaDevices
        .enumerateDevices()
        .then(devices => {
          devices.forEach(device => {
            if (device.kind == 'audioinput') {
              var _deviceData = {
                kind: device.kind,
                deviceId: device.deviceId
              };
              if (device.label && device.label.length > 0) {
                _deviceData.name = device.label;
              } else {
                _deviceData.name = `Audio Device-${audioInputDevices.length +
                  1}`;
              }
              audioInputDevices.push(_deviceData);
              audioExist = true;
              gumConstraints.audio = true;
              try {
                var exact = { exact: device.deviceId };
                var _device = { deviceId: exact };
                gumConstraints.audio = _device;
              } catch (something) {
                //                            console.log("something",something);
              }
            }
            if (device.kind == 'videoinput') {
              var _deviceData = {
                kind: device.kind,
                deviceId: device.deviceId
              };
              if (device.label && device.label.length > 0) {
                _deviceData.name = device.label;
              } else {
                _deviceData.name = `Video Device-${videoInputDevices.length +
                  1}`;
              }
              videoInputDevices.push(_deviceData);
              videoExist = true;
              gumConstraints.video = true;
              try {
                var exact = { exact: device.deviceId };
                var _device = { deviceId: exact };
                gumConstraints.video = _device;
              } catch (something) {
                //                            console.log("something",something);
              }
              // gumConstraints.video.deviceId = exact;
            }
          });
          if (!isIndex) {
            try {
              renderCheckList(1, audioInputDevices, gumConstraints);
              renderCheckList(2, videoInputDevices, gumConstraints);
            } catch (e) {
              //                        console.log("e",e);
            }
          }
          // if(reEnumerate){
          // getInitalScreen(false,false);
          // }else{
          if (generatePreview) {
            renderVideoPreview(gumConstraints, null, null, reEnumerate);
          }
          // }
        })
        .catch(err => {
          //                console.log(err.name + ": " + err.message);
        });
    }
  };

  win.renderCheckList = function(type, deviceArray, gumConstraints) {
    var el = document.createElement('option');
    el.text = 'none'; //no i18n
    el.value = 'none'; //no i18n
    el.disabled = true;
    if (type == 1) {
      //audio
      var select = document.getElementById('audio-select');
      for (var i = select.length - 1; i >= 0; i--) {
        select.remove(i);
      }
      el.id = 'none-audio';
    } else if (type == 2) {
      select = document.getElementById('video-select');
      for (var i = select.length - 1; i >= 0; i--) {
        select.remove(i);
      }
      el.id = 'none-video';
    }
    select.appendChild(el);
    if (type == 1) {
      //audio
      var select = document.getElementById('audio-select');
      if (deviceArray.length > 0) {
        var selectedDeviceId = gumConstraints.audio.deviceId.exact;
      }
    } else if (type == 2) {
      select = document.getElementById('video-select');
      if (deviceArray.length > 0) {
        var selectedDeviceId = gumConstraints.video.deviceId.exact;
      }
    }
    let options = deviceArray;
    if (options.length > 0) {
      options.forEach(option => {
        let opt = option;
        let el = document.createElement('option');
        el.text = opt.name;
        el.value = opt.deviceId;
        el.id = opt.deviceId;
        if (selectedDeviceId == opt.deviceId) {
          el.selected = true;
        }
        select.setAttribute('data-pselected', el.value);
        select.setAttribute('data-selected', el.value);
        select.appendChild(el);
      });
    } else {
      if (select && select.options.length > 0) {
        var el = select.options[0];
        el.selected = true;
        select.setAttribute('data-pselected', el.value);
        select.setAttribute('data-selected', el.value);
      }
    }
    // else{
    // var el = document.createElement("option");
    // el.text = "none"; //no i18n
    // el.value = "none"; //no i18n
    // el.id = "none";
    // el.selected = true;
    // select.appendChild(el);
    // }
  };

  win.renderVideoPreview = function(
    gumConstraints,
    resolve,
    reject,
    reEnumerate
  ) {
    navigator.mediaDevices.getUserMedia(gumConstraints).then(
      stream => {
        if (reEnumerate) {
          getInitalScreen(false, false, false);
        }
        createpreviewelement(stream, gumConstraints);
        if (resolve) {
          resolve();
        }
      },
      error => {
        if (reject) {
          reject();
        }
        let messageObj = {};
        messageObj.title = 'Oops!'; //no i18n
        messageObj.content = error.toString();
        openModalDialog('error', messageObj); //no i18n
        // window.alert("erroringettingmedia"+"   "+error.toString()); //no i18n
        // document.getElementById('user-form').classList.add('d-none');  //no i18n
        //TODO: throw Error [callbacks.error({code: error.code, name: error.name, message: error.message});]
      }
    );
  };

  win.createpreviewelement = function(stream, gumConstraints) {
    let video = document.getElementById('preview-video');
    if (media_channel.webRTCAdapter.browserDetails.browser === 'chrome') {
      try {
        let chromever = media_channel.webRTCAdapter.browserDetails.version;
        if (chromever >= 43) {
          video.srcObject = stream;
        } else if (typeof video.src !== 'undefined') {
          video.src = URL.createObjectURL(stream);
        } else {
          media_channel.Debug.warn('Error attaching stream to element'); //no i18n
        }
      } catch (exception) {}
    } else {
      video.srcObject = stream;
    }
    if (video) {
      // video.src=URL.createObjectURL(stream);
      // video.srcObject=stream;
      video.autoplay = true;
      video.muted = true;
      //        if(gumConstraints.audio){
      //            // document.getElementById("audio-slider").checked = true;
      //        }
      //        if(gumConstraints.video){
      //            // document.getElementById("video-slider").checked = true;
      //        }
      if (!video.classList.contains('mirror')) {
        video.classList.add('mirror'); //no i18n
      }
    } else {
      let videoNew = document.createElement('video');
      videoNew.id = 'preview-video';
      videoNew.src = URL.createObjectURL(stream);
      videoNew.srcObject = stream;
      videoNew.autoplay = true;
      videoNew.muted = true;
      videoNew.classList.add('mirror'); //no i18n
      //        if(gumConstraints.audio){
      //            // document.getElementById("audio-slider").checked = true;
      //        }
      //        if(gumConstraints.video){
      //            // document.getElementById("video-slider").checked = true;
      //        }
    }
  };

  win.constructConstraints = function(resolve, reject) {
    let audioSelect = document.getElementById('audio-select');
    let videoSelect = document.getElementById('video-select');
    let audioSelectedValue = audioSelect.value;
    let videoSelectedValue = videoSelect.value;
    let previouslySelectedAudio = audioSelect.dataset.selected;
    let previouslySelectedVideo = videoSelect.dataset.selected;
    audioSelect.setAttribute('data-pselected', previouslySelectedAudio);
    videoSelect.setAttribute('data-pselected', previouslySelectedVideo);
    audioSelect.setAttribute('data-selected', audioSelectedValue);
    videoSelect.setAttribute('data-selected', videoSelectedValue);
    let audio = false;
    let video = false;
    let videoEl = document.getElementById('preview-video');
    let mediaStream = videoEl.srcObject;
    let gumConstraints = {
      audio: audio,
      video: video
    };
    if (videoSelectedValue != 'none') {
      var exact = { exact: videoSelectedValue };
      var _device = { deviceId: exact };
      gumConstraints.video = _device;
    }
    // else{
    if (mediaStream && mediaStream.getVideoTracks()[0]) {
      mediaStream.getVideoTracks()[0].stop();
    }
    // }
    if (audioSelectedValue != 'none') {
      var exact = { exact: audioSelectedValue };
      var _device = { deviceId: exact };
      gumConstraints.audio = _device;
    }
    // else{
    if (mediaStream && mediaStream.getAudioTracks()[0]) {
      mediaStream.getAudioTracks()[0].stop();
    }
    // }
    if (audioSelectedValue != 'none' || videoSelectedValue != 'none') {
      renderVideoPreview(gumConstraints, resolve, reject);
    } else {
      try {
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => {
            track.stop();
          });
        }
      } catch (exception) {
        //            console.log("exception",exception);
      }
    }
  };

  win.playVideo = function(id) {
    let pluginId = id.substr(id.indexOf('-') + 1);
    let video = `sub-${pluginId}`; //no i18n
    let el = document.getElementById(video);
    if (video) {
      let promise = el.play();
      if (promise != undefined) {
        promise.then(() => {
          let audio = document.getElementById(`${pluginId}-audio`);
          if (audio) {
            let audioPromise = audio.play();
            if (audioPromise != undefined) {
              audioPromise.then(() => {
                let videoFailDiv = document.getElementById(
                  `callbackfail-${pluginId}`
                );
                if (
                  videoFailDiv &&
                  !videoFailDiv.classList.contains('d-none-imp')
                ) {
                  videoFailDiv.classList.add('d-none-imp'); //no i18n
                }
              });
            }
          } else {
            let videoFailDiv = document.getElementById(
              `callbackfail-${pluginId}`
            );
            if (
              videoFailDiv &&
              !videoFailDiv.classList.contains('d-none-imp')
            ) {
              videoFailDiv.classList.add('d-none-imp'); //no i18n
            }
          }
        });
      }
      if (promise != undefined) {
        promise.then(() => {}).catch(error => {});
      }
    }
    // var videoFailDiv = document.getElementById("callbackfail-"+pluginId);
    // if(videoFailDiv && !videoFailDiv.classList.contains('d-none-imp')){
    //     videoFailDiv.classList.add('d-none-imp'); //no i18n
    // }
  };

  win.createVideoElement = function(handleInstance) {
    try {
      let id = handleInstance.pluginId;
      let videoContainer = document.createElement('div');
      videoContainer.id = `parent-${id}`;
      let videoFooter = document.createElement('div');
      videoFooter.className = 'video-footer';
      videoFooter.id = `footer-${id}`;
      let videoParent = document.createElement('div');
      videoParent.id = id;
      let videoFailDiv = document.createElement('div');
      videoFailDiv.id = `callbackfail-${id}`;
      videoFailDiv.classList.add('fail-parent', 'd-none-imp'); //no i18n
      let failButton = document.createElement('button');
      failButton.classList.add('fail-button'); //no i18n
      failButton.innerHTML = '&#9658';
      failButton.id = `fail-${id}`;
      failButton.setAttribute('onClick', 'playVideo(this.id)');
      videoFailDiv.appendChild(failButton);
      videoParent.appendChild(videoFailDiv);
      let notifySpan = document.createElement('span');
      notifySpan.id = `talking-${id}`;
      notifySpan.className =
        'notification-count notification-member notify-mic-requestnotification-count notification-member notify-user-talking d-none-imp';
      notifySpan.innerHTML =
        '<div class="animate-pulse"><div class="center"></div><div class="down"></div><div class="up"></div></div>';
      videoParent.appendChild(notifySpan);
      let _videoParent = videoParent;
      let _videoContainer = videoContainer;
      let isExistingUser = cmServer.users.find(user => {
        if (handleInstance.source == 1) {
          if (user.userId == handleInstance.userId) {
            return user;
          }
        } else if (handleInstance.source == 2) {
          if (user.userId == handleInstance.userId) {
            return user;
          }
          if (
            user.userId ==
            handleInstance.userId.substring(
              0,
              handleInstance.userId.indexOf('-')
            )
          ) {
            return user;
          }
        }
      });
      if (handleInstance.handleType == 1) {
        //publisher
        videoContainer.setAttribute('data-isPublisher', 1);
        var videoFooterHInnerHTML = `${id}-publisher`; //no i18n
        if (isExistingUser) {
          if (handleInstance.source == 1) {
            videoFooterHInnerHTML = textify(isExistingUser.appProperty.name);
          } else {
            if (handleInstance.source == 2) {
              videoFooterHInnerHTML = textify(
                `${isExistingUser.appProperty.name}'s screen`
              ); //no i18n
            }
          }
        }
        if (handleInstance.source == 1) {
          //user camera/mic
          var publisher = '-publisher'; //no i18n
          //add if need to provide publish/unpublish
          if (handleInstance.webrtcCORE.options.audio) {
            var micIcon = '#mic-icon'; //no i18n
          } else {
            micIcon = '#mic-disable-icon'; //no i18n
          }
          if (handleInstance.webrtcCORE.options.video) {
            var camIcon = '#cam-icon'; //no i18n
          } else {
            camIcon = '#cam-disable-icon'; //no i18n
          }
          var footerhId = `footer-${handleInstance.userId}`; //no i18n
          //videoFooter.innerHTML="<h6 id="+footerhId+">"+videoFooterHInnerHTML+"</h6>\n<ul class=\"list-unstyled\">\n<li>\n<a role=\"button\" href=\"#\" id="+id+"-mic data-pluginid="+id+" onClick='toggleMyMic(this.id)'>\n<svg>\n<use xlink:href="+micIcon+"></use>\n</svg>\n</a>\n</li>\n<li>\n<a role=\"button\" href=\"#\" id="+id+"-cam data-pluginid="+id+" onClick='toggleMyCam(this.id)'>\n<svg>\n<use xlink:href="+camIcon+"></use>\n</svg>\n</a>\n</li><li><a role=\"button\" id="+id+"-device-change data-pluginid="+id+" onClick='changeDevice(id)'><svg><use xlink:href=#add-circle-icon></use></svg></a></li></ul>\n"; //no i18n

          //developer mode
          if (isDeveloper) {
            let changeBitRate1 = '128kb'; //no i18n
            let changeBitRate2 = '512kb'; //no i18n
            let changeBitRate3 = '1Mb'; //no i18n
            let changeBitRate4 = '2Mb'; //no i18n
            let changeBitRate5 = '2.5Mb'; //no i18n
            let changeBitRate6 = '3Mb'; //no i18n
            videoFooter.innerHTML =
              `<h6 id=${footerhId}>${videoFooterHInnerHTML}</h6>\n<ul class="list-unstyled">\n<li>\n<a role="button" href="#" id=${id}-mic data-pluginid=${id} onClick='toggleMyMic(this.id)'>\n<svg>\n<use xlink:href=${micIcon}></use>\n</svg>\n</a>\n</li>\n<li>\n<a role="button" href="#" id=${id}-cam data-pluginid=${id} onClick='toggleMyCam(this.id)'>\n<svg>\n<use xlink:href=${camIcon}></use>\n</svg>\n</a>\n</li><li><a role="button" id=${id}-device-change data-pluginid=${id} onClick='changeDevice(id)'><svg><use xlink:href=#add-circle-icon></use></svg></a></li>\n<li>\n<a href="#" id=${id}-CBR` +
              ` data-pluginid=${id} onClick='callBitRateChangeFunction(this.id,128000)'>\n${changeBitRate1}\n</a>\n</li>\n<li>\n<a href="#" id=${id}-CBR` +
              ` data-pluginid=${id} onClick='callBitRateChangeFunction(this.id,512000)'>\n${changeBitRate2}\n</a>\n</li>\n<li>\n<a href="#" id=${id}-CBR` +
              ` data-pluginid=${id} onClick='callBitRateChangeFunction(this.id,1024000)'>\n${changeBitRate3}\n</a>\n</li>\n<li>\n<a href="#" id=${id}-CBR` +
              ` data-pluginid=${id} onClick='callBitRateChangeFunction(this.id,2048000)'>\n${changeBitRate4}\n</a>\n</li>\n<li>\n<a href="#" id=${id}-CBR` +
              ` data-pluginid=${id} onClick='callBitRateChangeFunction(this.id,2560000)'>\n${changeBitRate5}\n</a>\n</li>\n<li>\n<a href="#" id=${id}-CBR` +
              ` data-pluginid=${id} onClick='callBitRateChangeFunction(this.id,3072000)'>\n${changeBitRate6}\n</a>\n</li>\n</ul>\n`; //no i18n
          } else {
            videoFooter.innerHTML = `<h6 id=${footerhId}>${videoFooterHInnerHTML}</h6>\n<ul class="list-unstyled">\n<li>\n<a role="button" href="#" id=${id}-mic data-pluginid=${id} onClick='toggleMyMic(this.id)'>\n<svg>\n<use xlink:href=${micIcon}></use>\n</svg>\n</a>\n</li>\n<li>\n<a role="button" href="#" id=${id}-cam data-pluginid=${id} onClick='toggleMyCam(this.id)'>\n<svg>\n<use xlink:href=${camIcon}></use>\n</svg>\n</a>\n</li><li><a role="button" id=${id}-device-change data-pluginid=${id} onClick='changeDevice(id)'><svg><use xlink:href=#add-circle-icon></use></svg></a></li></ul>\n`; //no i18n
          }

          videoFooter.setAttribute('data-pluginid', id);
        } else if (handleInstance.source == 2) {
          //screenshare
          var publisher = '-publisher'; //no i18n
          var fullscreenIcon = '#maximize-icon'; //no i18n
          var footerhId = `footer-screen-${handleInstance.userId}`; //no i18n
          if (whiteboard) {
            videoFooter.innerHTML = `<h6 id=${footerhId}>${videoFooterHInnerHTML}</h6>\n<ul class='list-unstyled'>\n<li><a role="button" id=${id}-canvas-start data-pluginid=${id} onClick='createCanvas(id)'>Draw</a></li><li><a role="button" id=${id}-canvas-undo data-pluginid=${id} onClick='undoCanvas(id)'>Undo</a></li><li><a role="button" id=${id}-canvas-redo data-pluginid=${id} onClick='redoCanvas(id)'>Redo</a></li><li><a role="button" id=${id}-canvas-clear data-pluginid=${id} onClick='clearCanvas(id)'>Clear All</a></li><li><a role="button" id=${id}-canvas-capture data-pluginid=${id} onClick='capture(id)'>Capture</a></li><li>\n<a role="button" href='#' id=${id}-fullscreentoggle data-pluginid=${id} onClick='openFullscreen(this.id)'>\n<svg>\n<use xlink:href=${fullscreenIcon}></use>\n</svg>\n</a>\n</li>\n</ul>\n`; //no i18n
          } else {
            videoFooter.innerHTML = `<h6 id=${footerhId}>${videoFooterHInnerHTML}</h6>\n<ul class='list-unstyled'>\n<li>\n<a role="button" href='#' id=${id}-fullscreentoggle data-pluginid=${id} onClick='openFullscreen(this.id)'>\n<svg>\n<use xlink:href=${fullscreenIcon}></use>\n</svg>\n</a>\n</li>\n</ul>\n`; //no i18n
          }
          videoFooter.classList.add('video-screen-footer'); //no i18n
          videoFooter.setAttribute('data-pluginid', id);
        }
      } else {
        //subscriber
        videoContainer.setAttribute('data-isPublisher', 0);
        var videoFooterHInnerHTML = id;
        if (isExistingUser) {
          if (handleInstance.source == 1) {
            videoFooterHInnerHTML = textify(isExistingUser.appProperty.name);
          } else {
            if (handleInstance.source == 2) {
              videoFooterHInnerHTML = textify(
                `${isExistingUser.appProperty.name}'s screen`
              ); //no i18n
            }
          }
        }
        if (handleInstance.source == 1) {
          var footerhId = `footer-${handleInstance.userId}`; //no i18n

          //videoFooter.innerHTML="<h6 id="+footerhId+">"+videoFooterHInnerHTML+"</h6>\n<ul class=\"list-unstyled\">\n<li>\n<a role=\"button\" href=\"#\" id="+id+"-mic"+" data-pluginid="+id+" onClick='toggleMyMic(this.id)'>\n<svg>\n<use xlink:href=\"#speaker-icon\"></use>\n</svg>\n</a>\n</li>\n<li>\n<a role=\"button\" href=\"#\" id="+id+"-cam"+" data-pluginid="+id+" onClick='toggleMyCam(this.id)'>\n<svg>\n<use xlink:href=\"#cam-icon\"></use>\n</svg>\n</a>\n</li>\n</ul>\n"; //no i18n

          //developer mode
          if (isDeveloper) {
            let substreamLayer2 = 'SL2'; //no i18n
            let substreamLayer1 = 'SL1'; //no i18n
            let substreamLayer0 = 'SL0'; //no i18n
            let temporalLayer2 = 'TL2'; //no i18n
            let temporalLayer1 = 'TL1'; //no i18n
            let temporalLayer0 = 'TL0'; //no i18n
            videoFooter.innerHTML =
              `<h6 id=${footerhId}>${videoFooterHInnerHTML}</h6>\n<ul class="list-unstyled">\n<li>\n<a role="button" href="#" id=${id}-mic` +
              ` data-pluginid=${id} onClick='toggleMyMic(this.id)'>\n<svg>\n<use xlink:href="#speaker-icon"></use>\n</svg>\n</a>\n</li>\n<li>\n<a role="button" href="#" id=${id}-cam` +
              ` data-pluginid=${id} onClick='toggleMyCam(this.id)'>\n<svg>\n<use xlink:href="#cam-icon"></use>\n</svg>\n</a>\n</li>\n<li>\n<a href="#" id=${id}-SLC` +
              ` data-pluginid=${id} onClick='substreamLayerChangeFunction(this.id,2)'>\n${substreamLayer2}\n</a>\n</li>\n<li>\n<a href="#" id=${id}-SLC` +
              ` data-pluginid=${id} onClick='substreamLayerChangeFunction(this.id,1)'>\n${substreamLayer1}\n</a>\n</li>\n<li>\n<a href="#" id=${id}-SLC` +
              ` data-pluginid=${id} onClick='substreamLayerChangeFunction(this.id,0)'>\n${substreamLayer0}\n</a>\n</li>\n<li>\n<a href="#" id=${id}-TLC` +
              ` data-pluginid=${id} onClick='temporalLayerChangeFunction(this.id,2)'>\n${temporalLayer2}\n</a>\n</li>\n<li>\n<a href="#" id=${id}-TLC` +
              ` data-pluginid=${id} onClick='temporalLayerChangeFunction(this.id,1)'>\n${temporalLayer1}\n</a>\n</li>\n<li>\n<a href="#" id=${id}-TLC` +
              ` data-pluginid=${id} onClick='temporalLayerChangeFunction(this.id,0)'>\n${temporalLayer0}\n</a>\n</li>\n</ul>\n`; //no i18n
          } else {
            videoFooter.innerHTML =
              `<h6 id=${footerhId}>${videoFooterHInnerHTML}</h6>\n<ul class="list-unstyled">\n<li>\n<a role="button" href="#" id=${id}-mic` +
              ` data-pluginid=${id} onClick='toggleMyMic(this.id)'>\n<svg>\n<use xlink:href="#speaker-icon"></use>\n</svg>\n</a>\n</li>\n<li>\n<a role="button" href="#" id=${id}-cam` +
              ` data-pluginid=${id} onClick='toggleMyCam(this.id)'>\n<svg>\n<use xlink:href="#cam-icon"></use>\n</svg>\n</a>\n</li>\n</ul>\n`; //no i18n
          }
        } else if (handleInstance.source == 2) {
          var fullscreenIcon = '#maximize-icon'; //no i18n
          var footerhId = `footer-screen-${handleInstance.userId.substring(
            0,
            handleInstance.userId.indexOf('-')
          )}`; //no i18n
          if (whiteboard && !subscriberOnly) {
            videoFooter.innerHTML = `<h6 id=${footerhId}>${videoFooterHInnerHTML}</h6>\n<ul class='list-unstyled'>\n<li><a role="button" id=${id}-canvas-start data-pluginid=${id} onClick='createCanvas(id)'>Draw</a></li><li><a role="button" id=${id}-canvas-undo data-pluginid=${id} onClick='undoCanvas(id)'>Undo</a></li><li><a role="button" id=${id}-canvas-redo data-pluginid=${id} onClick='redoCanvas(id)'>Redo</a></li><li><a role="button" id=${id}-canvas-clear data-pluginid=${id} onClick='clearCanvas(id)'>Clear All</a></li><li><a role="button" id=${id}-canvas-capture data-pluginid=${id} onClick='capture(id)'>Capture</a></li><li>\n<a role="button" href='#' id=${id}-fullscreentoggle data-pluginid=${id} onClick='openFullscreen(this.id)'>\n<svg>\n<use xlink:href=${fullscreenIcon}></use>\n</svg>\n</a>\n</li>\n</ul>\n`; //no i18n
          } else {
            videoFooter.innerHTML = `<h6 id=${footerhId}>${videoFooterHInnerHTML}</h6>\n<ul class='list-unstyled'>\n<li>\n<a role="button" href='#' id=${id}-fullscreentoggle data-pluginid=${id} onClick='openFullscreen(this.id)'>\n<svg>\n<use xlink:href=${fullscreenIcon}></use>\n</svg>\n</a>\n</li>\n</ul>\n`; //no i18n
          }
          videoFooter.classList.add('video-screen-footer'); //no i18n
          videoFooter.setAttribute('data-pluginid', id);
        }
      }
      let video = document.createElement('video');
      let muteDiv = document.createElement('div');
      muteDiv.innerHTML =
        '<img class=\'video-silo\' src=\'../images/person-empty.svg\'>\n</img>\n'; //no i18n
      muteDiv.classList.add('d-none'); //no i18n
      muteDiv.id = `${id}-silo`;
      video.autoplay = true;
      if (handleInstance.handleType == 1) {
        video.muted = true;
      }
      video.id = `sub-${id}`;
      if (handleInstance.source == 1) {
        video.style = 'height:100%;width:100%;top:0px;left:0px;';
      } else if (handleInstance.source == 2) {
        video.style =
          'height:calc(100%);width:auto;position:absolute;top:0;right:0;left:0;margin:auto;';
      }
      if (handleInstance.source == 1 && handleInstance.handleType == 1) {
        video.classList.add('mirror'); //no i18n
      }
      //transform: rotateY(180deg);-webkit-transform:rotateY(180deg);-moz-transform:rotateY(180deg);
      if (videoParent) {
        videoParent.appendChild(muteDiv);
        if (handleInstance.source == 1) {
          videoParent.appendChild(video);
          videoParent.appendChild(videoFooter);
          videoContainer.appendChild(videoParent);
          videoContainer.className = `${'video-chat' + ' '}${
            handleInstance.userId
          }`;
          videoParent.className = 'temporary-video';
          document.getElementById('appendhere').appendChild(videoContainer);
          // if(document.getElementsByClassName(handleInstance.userId).length>0 && handleInstance.userId != userId){
          //                        setBorderConditions(handleInstance.userId);
          //                 }
        } else {
          videoParent.appendChild(video);
          videoParent.appendChild(videoFooter);
          videoContainer.appendChild(videoParent);
          videoContainer.className = `${'video-chat OT_big' + ' '}${
            handleInstance.userId
          }`;
          videoParent.className = 'temporary-screen';
          document.getElementById('appendhere').appendChild(videoContainer);
          //                    setBorderConditions(handleInstance.userId);
        }
        layout.layout();
        video.onplay = function() {
          layout.layout();
        };
      }
    } catch (e) {
      //            console.log("e",e);
    }
  };

  win.destroyElement = function(handle) {
    let toBeDestroyed = document.getElementById(`parent-${handle.pluginId}`);
    if (toBeDestroyed) {
      toBeDestroyed.parentNode.removeChild(toBeDestroyed);
      layout.layout();
    }
    if (
      handle.handleType == 1 &&
      handle.source == 3 &&
      needAuxillaryFeature == true
    ) {
      let comboScreen = document.getElementById('parent-combo-screen');
      if (comboScreen) {
        comboScreen.parentNode.removeChild(comboScreen);
      }
      let comboscreen = document.getElementById('original-screenshare-parent');
      if (comboscreen) {
        comboscreen.parentNode.removeChild(comboscreen);
      }
      let comboScree = document.getElementById(
        'original-screenshare-container'
      );
      if (comboScree) {
        comboScree.parentNode.removeChild(comboScree);
      }
    }
    if (handle.source == 2 && whiteboard) {
      annotators.find(zAnnotator => {
        if (zAnnotator.pluginId == handle.pluginId) {
          zAnnotator.removeCanvasListeners(zAnnotator);
          // delete zAnnotator;
        }
      });
    }
    if (handle.source == 2) {
      toggleScreenShareButton();
    }
    layout.layout();
  };

  win.CloseUserForm = function() {
    let audioInUrl = document.getElementById('audio-select').dataset.pselected;
    let videoInUrl = document.getElementById('video-select').dataset.pselected;
    let audioel = audioInUrl;
    if (audioInUrl == 'none') {
      audioel = 'none-audio'; //no i18n
    }
    let videoel = videoInUrl;
    if (videoInUrl == 'none') {
      videoel = 'none-video'; //no i18n
    }
    stopTracks('preview-video'); //no i18n
    document.getElementById(audioel).selected = true;
    document.getElementById(videoel).selected = true;
    document
      .getElementById('audio-select')
      .setAttribute('data-selected', audioInUrl);
    document
      .getElementById('video-select')
      .setAttribute('data-selected', videoInUrl);
    document.getElementById('user-form').classList.add('d-none'); //no i18n
    document.body.removeEventListener('keydown', bindEscape);
  };

  //user handling

  win.sendUserCreate = function() {
    stopTracks('preview-video'); //no i18n
    if (cmServer) {
      startRenegotiation();
      return false;
    }
    if (!existingUser) {
      createNewuser();
      return false;
    }
    let promise = new Promise((resolve, reject) => {
      // if(!subscriberOnly){
      setAudioVideoParams(resolve, reject);
      // }
    });
    promise.then(
      resolve => {
        initCommunicationServer(roomId, userObj);
        document.getElementById('user-form').classList.add('d-none'); //no i18n
      },
      error => {
        //                        console.log("error",error);
      }
    );
    return false;
  };

  win.createNewuser = function() {
    let name = document.getElementById('name-field').value;
    //var role = document.getElementById('role-field').value;
    let role = 'Member'; //no i18n
    let req = new ajaxReq(`/roomaction/${roomId}/user/create`); //no i18n
    //to monitoring server
    let dataObjActionSegment = window.constructActionSegment(
      'CREATE_USER',
      1,
      new Date().getTime(),
      JSON.stringify({ source: 'FromClientToMS' })
    ); //no i18n
    let relationalIds = [];
    relationalIds.push(parseInt(roomId));
    let dataObjAction = window.constructAction(
      dataObjActionSegment,
      relationalIds
    );
    let moduleAS = window.constructModuleAS(
      roomId,
      'CREATE_USER',
      dataObjAction
    ); //no i18n
    window.pushModuleAS(moduleAS);

    req.response = function(response) {
      let { responseString } = JSON.parse(response);
      let propertyList = JSON.parse(responseString);
      let appProperty = null;
      if (propertyList.appProperty && propertyList.appProperty.length > 0) {
        appProperty = JSON.parse(propertyList.appProperty);
      }
      // let permissionProperty = null;
      // if (
      //   propertyList.permissionProperties &&
      //   propertyList.permissionProperties.length > 0
      // ) {
      //   permissionProperty = JSON.parse(propertyList.permissionProperties);
      // }
      userObj = new z_user(
        propertyList.userId,
        propertyList.appProperty,
        propertyList.permissionProperties
      );
      userId = propertyList.userId;
      let user = window.constructModule(
        'ST',
        propertyList.user,
        'user',
        new Date().getTime(),
        appProperty,
        null
      ); //no i18n
      window.pushMiniModule(module, user);
      //                module.pushMiniModule(module,user);
      let promise = new Promise((resolve, reject) => {
        // if(!subscriberOnly){
        setAudioVideoParams(resolve, reject);
        // }
      });
      promise.then(
        resolve => {
          initCommunicationServer(roomId, userObj);

          //to monitoring server
          let dataObjActionSegment = window.constructActionSegment(
            'CREATE_USER',
            3,
            new Date().getTime(),
            JSON.stringify({ source: 'FromMSToClient', response: propertyList })
          ); //no i18n
          let relationalIds = [];
          relationalIds.push(parseInt(roomId));
          let dataObjAction = window.constructAction(
            dataObjActionSegment,
            relationalIds
          );
          let moduleAS = window.constructModuleAS(
            roomId,
            'CREATE_USER',
            dataObjAction
          ); //no i18n
          window.pushModuleAS(moduleAS);
        },
        error => {
          //                            console.log("error",error);
        }
      );
    };
    req.error = function(error) {};
    let userAppProperty = { name: name, role: role };
    let userPermission = {
      publish: true,
      subscribe: true,
      screenshare: true,
      annotate: true
    };
    let comEvent = createUserProtoRequest(
      roomId,
      userAppProperty,
      userPermission
    );
    req.send('POST', comEvent); //no i18n
    document.getElementById('user-form').classList.add('d-none'); //no i18n
  };

  win.manageUser = function(roomId) {
    let ruCookie = getCookie('CS_userId'); //no i18n
    if (ruCookie != null) {
      let cookieTokens = ruCookie.split('-');
      if (roomId == cookieTokens[0]) {
        userId = cookieTokens[1];
        getUserData(roomId, userId);
      } else {
        createUser(roomId);
      }
    } else {
      createUser(roomId);
    }
  };

  win.getCookie = function(name) {
    let nameEQ = `${name}=`;
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1, c.length);
      }
      if (c.indexOf(nameEQ) == 0) {
        return c.substring(nameEQ.length, c.length);
      }
    }
    return null;
  };

  win.getUserData = function(roomId, _userId) {
    let req = new ajaxReq(`/roomaction/${roomId}/user/${_userId}`); //no i18n
    //to monitoring server
    let dataObjActionSegment = window.constructActionSegment(
      'GET_USER_DATA',
      1,
      new Date().getTime(),
      JSON.stringify({ source: 'FromClientToMS' })
    ); //no i18n
    let relationalIds = [];
    relationalIds.push(parseInt(roomId), parseInt(_userId));
    let dataObjAction = window.constructAction(
      dataObjActionSegment,
      relationalIds
    );
    let moduleAS = window.constructModuleAS(
      roomId,
      'GET_USER_DATA',
      dataObjAction
    ); //no i18n
    window.pushModuleAS(moduleAS);

    req.response = function(response) {
      if (response && response.length > 0) {
        let { responseString } = JSON.parse(response);
        let propertyList = JSON.parse(responseString);
        let appProperty = null;
        if (propertyList.appProperty && propertyList.appProperty.length > 0) {
          appProperty = JSON.parse(propertyList.appProperty);
        }
        let permissionProperties = null;
        if (
          propertyList.permissionProperties &&
          propertyList.permissionProperties.length > 0
        ) {
          permissionProperties = JSON.parse(propertyList.permissionProperties);
        }
        let user = window.constructModule(
          'ST',
          propertyList.user,
          'user',
          new Date().getTime(),
          appProperty,
          null
        ); //no i18n
        window.pushMiniModule(module, user);
        document.getElementById('name-field').value = appProperty.name;
        document.getElementById('name-field').disabled = true;
        existingUser = true;
        userObj = new z_user(
          propertyList.user,
          propertyList.appProperty,
          propertyList.permissionProperties
        );
        createUser(roomId);

        //to monitoring server
        let dataObjActionSegment = window.constructActionSegment(
          'GET_USER_DATA',
          3,
          new Date().getTime(),
          JSON.stringify({ source: 'FromMSToClient', response: propertyList })
        ); //no i18n
        let relationalIds = [];
        relationalIds.push(parseInt(roomId), parseInt(_userId));
        let dataObjAction = window.constructAction(
          dataObjActionSegment,
          relationalIds
        );
        let moduleAS = window.constructModuleAS(
          roomId,
          'GET_USER_DATA',
          dataObjAction
        ); //no i18n
        window.pushModuleAS(moduleAS);
      } else {
        userId = '';
        createUser(roomId);
      }
    };
    req.error = function(error) {};
    let comEvent = {};
    req.send('GET', comEvent); //no i18n
  };

  win.createUser = function(roomId) {
    let userForm = document.getElementById('user-form');
    if (userForm) {
      userForm.classList.remove('d-none'); //no i18n
    }
  };

  win.createUserProtoRequest = function(
    roomId,
    userAppProperty,
    userPermissionProperty
  ) {
    let css_proto = new CS_PROTO(roomId);
    let eventParams = {
      appProperty: JSON.stringify(userAppProperty),
      permissionProperties: JSON.stringify(userPermissionProperty)
    };
    let messageRoute = css_proto.constructMessageRoute(
      css_proto.MessageEvents.CREATE_USER,
      css_proto.constructDataRelay(null, { roomId: roomId }),
      eventParams
    ); //no i18n
    let reqMsg = css_proto.constructRequest(undefined, undefined, messageRoute);
    let comEvent = css_proto.constructCommunicationEvent(reqMsg);
    return comEvent;
  };

  win.addOrRemoveUser = function(_userId, add, time, user) {
    if (add) {
      var appProperty = JSON.parse(user.appProperty);
      var { name } = appProperty;
      notifyMe('New Notification', `${name} has joined this room.`); //no i18n
      if (document.getElementById(`${_userId}-in-list`)) {
        let statusel = document.getElementById(`${_userId}-status`);
        if (parseInt(statusel.dataset.time) < parseInt(time)) {
          statusel.setAttribute('data-time', time);
          statusel.innerHTML = 'IN'; //no i18n
        }
      } else {
        let attendeeslistsingle = document.createElement('li');
        attendeeslistsingle.className = 'attendees-list-single';
        attendeeslistsingle.id = `${_userId}-in-list`;

        let attendeesingle = document.createElement('div');
        attendeesingle.className = 'attendee-single';

        let attendeesingleprofileinfo = document.createElement('div');
        attendeesingleprofileinfo.className = 'attendee-single-profile-info';

        let attendeeprofileavatar = document.createElement('div');
        attendeeprofileavatar.className = 'attendee-profile-avatar';
        attendeeprofileavatar.style =
          'background-image: url(\'/images/annon-user-thumbnail.png\');';

        let attendeedetail = document.createElement('attendee-detail');
        attendeedetail.className = 'attendee-detail';

        let attendeename = document.createElement('attendee-name');
        attendeename.className = 'attendee-name';
        attendeename.innerHTML = textify(appProperty.name); //+"-"+user.user;

        //                if(userId == _userId) {
        let presenterbadge = document.createElement('span');
        presenterbadge.className = 'presenter-badge';
        presenterbadge.id = `${_userId}-status`;
        presenterbadge.innerHTML = 'IN'; //no i18n
        presenterbadge.setAttribute('data-time', time);
        attendeename.appendChild(presenterbadge);
        //                }

        let attendeesessiontime = document.createElement('span');
        attendeesessiontime.className = 'attendee-session-time';
        if (userId == _userId) {
          attendeesessiontime.innerHTML = textify(appProperty.role);
        } else {
          attendeesessiontime.innerHTML = textify(appProperty.role);
        }

        attendeedetail.appendChild(attendeename);
        attendeedetail.appendChild(attendeesessiontime);

        attendeesingleprofileinfo.appendChild(attendeeprofileavatar);
        attendeesingleprofileinfo.appendChild(attendeedetail);

        attendeesingle.appendChild(attendeesingleprofileinfo);

        attendeeslistsingle.appendChild(attendeesingle);

        document
          .getElementById('add-attendees-here')
          .appendChild(attendeeslistsingle);
        let userAction = false;
        if (_userId == userId) {
          userAction = true;
        }
      }
      //                checkAndScroll(userAction);
    } else {
      var appProperty = JSON.parse(user.appProperty);
      var { name } = appProperty;
      notifyMe('New Notification', `${name} has left this room.`); //no i18n
      let thisUser = document.getElementById(`${_userId}-status`);
      if (thisUser) {
        if (parseInt(thisUser.dataset.time) < parseInt(time)) {
          thisUser.innerHTML = 'OUT'; //no i18n
          thisUser.setAttribute('data-time', time);
        }
      }
    }
    addPulseToColumn(0);
  };
  //media_conference object

  win.initCommunicationServer = function(roomId, userObj) {
    cmServer = new com_server(roomId);

    cmServer.Events.onInit = function(e) {
      cmServer.connect(userObj.userId);
      cmServer.users.push(userObj);
      let userPermission = checkIfUserHasPermission(userObj, 'annotate'); //no i18n
      //            console.log("userPermission",userPermission);
      //             if(subscriberOnly != true){
      if (userPermission != 'false') {
        whiteboard = true;
      }
      // }
    };

    cmServer.Events.onConnect = function(e) {
      let add = true;
      if (allowMedia) {
        initMediaChannel(cmServer);
      }
    };

    cmServer.Events.onMessage = function(e) {
      addChat(e);
    };

    cmServer.Events.onJoinedRoom = function(e) {
      let add = true;
      addOrRemoveUser(e.user, add, e.time, e);
      if (whiteboard) {
        if (e.user != userId) {
          window.checkAndSendBulkData(userId, e.user);
        }
      }
    };

    cmServer.Events.onLeftRoom = function(e) {
      let add = false;
      addOrRemoveUser(e.user, add, e.time, e);
      if (whiteboard) {
        if (e.user != userObj.userId) {
          window.removeThisUserData(userObj.userId, e.user);
        }
      }
    };

    cmServer.Events.onNewUser = function(e) {
      cmServer.users.push(e);
      let videoFooter = document.getElementById(`footer-${e.userId}`);
      if (videoFooter) {
        videoFooter.innerHTML = textify(e.appProperty.name);
      }
      let screenFooter = document.getElementById(`footer-screen-${e.userId}`);
      if (screenFooter) {
        screenFooter.innerHTML = textify(`${e.appProperty.name}'s screen`); //no i18n
      }
    };

    cmServer.Events.onMediaServerUp = function() {
      if (
        !document.getElementById('server-down').classList.contains('d-none-imp')
      ) {
        document.getElementById('server-down').classList.add('d-none-imp'); //no i18n
      }
      // initMediaChannel(cmServer);
    };

    cmServer.Events.onMediaServerDown = function() {
      if (med_ch) {
        //here, though connection doesnt exist...request to destroy the connection can still be sent.
        let sendReq = false; //media server is down. no point in sending request.
        med_ch.destroyAllHandlesFollowedBySession(sendReq);
      }
      if (
        document.getElementById('server-down').classList.contains('d-none-imp')
      ) {
        document.getElementById('server-down').classList.remove('d-none-imp'); //no i18n
      }
      setTimeout(() => {
        initMediaChannel(cmServer);
      }, 5000);
    };

    cmServer.init(roomId);

    cmServer.Events.onDisconnect = function(e) {
      setTimeout(() => {
        cmServer.connect(userObj.userId);
      }, 3000);
    };

    cmServer.Events.sseinitfailed = function(e) {
      // window.alert("Failed to init SSE. Server down?"); //no i18n
      let messageObj = {};
      messageObj.title = 'Oops!'; //no i18n
      messageObj.content = 'Failed to init SSE. Server down?'; //no i18n
      openModalDialog('error', messageObj); //no i18n
    };
  };

  win.initMediaChannel = function(cmServer) {
    if (med_ch) {
      //here, though connection doesnt exist...request to destroy the connection can still be sent.
      med_ch.destroyAllHandlesFollowedBySession(true);
    }
    let medCh = new media_channel(cmServer);
    med_ch = medCh;
    medCh.Events.onConnect = function(connection) {
      let connectionModule = window.constructModule(
        'ST',
        connection.connectionId,
        'session',
        new Date().getTime(),
        null,
        null
      ); //no i18n
      window.pushMiniModule(module, connectionModule);
      initConference(medCh, connection);
      startKeepAliveLoop(medCh);
    };
    medCh.Events.onDisconnect = function() {
      exit();
    };

    medCh.createConnection();
  };

  win.startKeepAliveLoop = function(medCh) {
    setTimeout(() => {
      let promise = new Promise((resolve, reject) => {
        med_ch.keepConnectionAlive(resolve, reject);
      });

      promise.then(resolve => {
        startKeepAliveLoop();
      });
    }, keepAlivePeriod);
  };

  win.checkIfUserHasPermission = function(userObj, permissionProperty) {
    if (userObj && userObj.permissionProperties) {
      let permissionPropertyObj = JSON.parse(userObj.permissionProperties);
      return permissionPropertyObj[permissionProperty];
    }
    return false;
  };

  /*win.testNetwork = function(medConf,confInstance,z_pub){
        var audioInURL = decodeURIComponent(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent("audio").replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
        var videoInURL = decodeURIComponent(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent("video").replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
        if(!medConf){
            medConf = med_conf;
        }
        var z_pub_test = medConf.initPublisher({audio:true,video:true,simulcast:doSimulcast,isTestPage:true,networkTest:true,bitrate:128000},{source:1,audio:audioInURL,video:videoInURL});
        z_pub_test.Events.onInit = function(publisher){
            z_pub_test.publish();
        }

        z_pub_test.Events.onStreamCreated = function(obj){
            /*var stream = obj.stream;
            var plugin = obj.plugin;
            var pubModule = window.constructModule("ST",plugin.pluginId,"publisher",new Date().getTime(),{'source':plugin.source,'userId':plugin.userId},null); //no i18n
            var parentModule = window.findMiniModule(module,"session"); //no i18n
            window.pushMiniModule(parentModule,pubModule);
            var eleme = document.getElementById("sub-"+plugin.pluginId);
            if(eleme){
                media_channel.attachMediaStream(eleme,stream,plugin);
                plugin.liveStream = true;
            }*/

  /*}

    z_pub_test.Events.onUnpublish = function(){
        // enableBlackScreen(z_pub);
        // setTimeout(function(){
        //     z_pub.publish();
        // },5000)
        return;
    }

    z_pub_test.Events.onPublish = function(){
        layout.layout();
        // if(z_pub.source == 2 || z_pub.source == 3){
        //     toggleScreenShareButton(z_pub);
        // }
        // disableBlackScreen(z_pub);
        if(!z_pub_test.webrtcCORE.webrtcUP){
            z_pub_test.publishTimer = setTimeout(function(){
                var messageObj = {};
                messageObj.title = "Oops!";//no i18n
                messageObj.content = "Failed to publish stream."; //no i18n
                messageObj.resolveBy = "rePublish(1)"; //no i18n
                messageObj.resolveMsg = "Try again.";//no i18n
                z_pub_test.detachHandle();
                openModalDialog("error",messageObj);//no i18n
            },5000);
        }
    }

    z_pub_test.Events.onWebrtcup = function(){
        if(z_pub_test.publishTimer){
            clearTimeout(z_pub_test.publishTimer);
        }
        /*z_pub.bitrateChangeLoop = setTimeout(function(){
            if((new Date().getTime())-(z_pub.webrtcCORE.lastNackReceivedTime)>=4000){
                z_pub.changeBitRate(z_pub.webrtcCORE.bitrate.value + 500000);
                console.log("New bitrate -->",(z_pub.webrtcCORE.bitrate.value + 500000));
                z_pub.Events.onWebrtcup();
            }
        },4000);*/
  //bitrateChangeLoop(4000);
  /*}

    /*function bitrateChangeLoop(interval){
        z_pub_test.bitrateChangeLoop = setTimeout(function(){
            if((new Date().getTime())-(z_pub_test.webrtcCORE.lastNackReceivedTime)>=4000){
                //z_pub.changeBitRate(z_pub.webrtcCORE.bitrate.value + 500000);
                //console.log("New bitrate -->",(z_pub.webrtcCORE.bitrate.value + 500000));
            }
            bitrateChangeLoop(interval);
        },interval);
    }*/

  /*z_pub_test.Events.initGetStats = function(){
        try{
            var self=z_pub_test;
            /*console.log("offerer --> ", self.webrtcCORE.pc);
            if(/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
                console.log("TESTT");
                window.getStats(self.webrtcCORE.pc, event.streams[0].getTracks()[0], function(result) {
                    console.log("Inside getstats loop...");
                    previewGetStatsResult(self.webrtcCORE.pc, result);
                }, 1000);
                return;
            }*/
  /*var counter = 21;
    var setBitrate = 128000;
    z_pub_test.publishTimer = setTimeout(function(){
        window.getStats(self.webrtcCORE.pc, function(result) {
            if(counter>0){
                //console.log("Inside getstats loop...");
                previewGetStatsResult(self.webrtcCORE.pc, result);
                counter-=1;
            }else if(counter==0){
                counter-=1;
                if(averageAudioPacketLossArray.length!=0){
                    var averageAudioPacketLoss = averageAudioPacketLossArray.reduce(getSum)/averageAudioPacketLossArray.length;
                }else{
                    var averageAudioPacketLoss=0.01;
                }
                if(averageVideoPacketLossArray.length!=0){
                    var averageVideoPacketLoss = averageVideoPacketLossArray.reduce(getSum)/averageVideoPacketLossArray.length;
                }else{
                    var averageVideoPacketLoss=0.01;
                }

                //console.log("Analysis Stopped...");
                //console.log("Final minima --> ",minima);
                //console.log("averageAudioPacketLossRatio --> ",averageAudioPacketLoss);
                //console.log("averageVideoPacketLossRatio --> ",averageVideoPacketLoss);

                if(averageVideoPacketLoss > 0.05){
                    setBitrate=128000;
                    //console.log("Worst Network. Hence sending stream at 128 kbps");
                }else if(averageVideoPacketLoss > 0.03){
                    if(minima>300000){
                        setBitrate=200000;
                        //console.log("Lossy Network. Hence sending stream at 200 kbps");
                    }else{
                        setBitrate=128000;
                        //console.log("Worst Network. Hence sending stream at 128 kbps");
                    }
                }else if(averageVideoPacketLoss > 0.01){
                    if(minima>500000){
                        setBitrate = minima - 200000;
                        if(setBitrate<128000){
                            setBitrate=128000;
                        }
                        //console.log("Slightly Lossy Network. Hence sending stream at "+ setBitrate + " bits per second");
                    }else{
                        setBitrate = minima - 100000;
                        if(setBitrate<128000){
                            setBitrate=128000;
                        }
                        //console.log("Slightly Lossy Network. Hence sending stream at "+ setBitrate + " bits per second");
                    }
                }else if(averageVideoPacketLoss > 0.003){
                    setBitrate = minima - 100000;
                    if(setBitrate<128000){
                        setBitrate=128000;
                    }
                    //console.log("Good Network. Hence sending stream at "+ setBitrate + " bits per second");
                }else if(averageVideoPacketLoss > 0.001){
                    setBitrate = minima - 50000;
                    if(setBitrate<128000){
                        setBitrate=128000;
                    }
                    //console.log("Very good Network. Hence sending stream at "+ setBitrate + " bits per second");
                }else{
                    setBitrate = minima;
                    if(setBitrate<128000){
                        setBitrate=128000;
                    }
                    //console.log("Excellent Network. Hence sending stream at "+ setBitrate + " bits per second");
                }

                if(z_pub_test.publishTimer){
                    clearTimeout(z_pub_test.publishTimer);
                    z_pub_test.detachHandle();
                }
                //initPublishers(medConf,confInstance,setBitrate);
                z_pub.changeBitRate(setBitrate);
                //console.log("Getstats stopped.. Requesting server to publish at "+ setBitrate + " bits per second");
                //return;

                function getSum(total, num) {
                    return total + num;
                }
            }
        }, 1000)
    },1000);
}catch(e){
    //console.log("Error --> ",e);
}
}

var averageAudioPacketLossArray = [];
var averageVideoPacketLossArray = [];
var minima=0;
var maxima=0;
var previousBitRateValue=0;

function previewGetStatsResult(peer, result) {
//console.log("bandwidth --> ",result.bandwidth.speed);
var bandwidth = result.bandwidth.speed * 8;
if(!isNaN(bandwidth)){
    bandwidth >= previousBitRateValue?maxima = bandwidth:minima = bandwidth;
    //console.log("Current bandwidth --> "+bandwidth+" Previous bandwidth --> "+previousBitRateValue+" Maxima --> "+maxima+"  Minima --> "+minima);
    previousBitRateValue = bandwidth;
}

var audioArrayIndex;
var videoArrayIndex;
for(var i=0;i < result.results.length;i++) {
    var c = result.results[i].hasOwnProperty("audioInputLevel");
    if(c){
        audioArrayIndex=i;
        videoArrayIndex=i+1;
        break;
    }
}

if(audioArrayIndex){
    if(!isNaN(result.results[audioArrayIndex].packetsLost/result.results[audioArrayIndex].packetsSent)){
        averageAudioPacketLossArray.push(result.results[audioArrayIndex].packetsLost/result.results[audioArrayIndex].packetsSent);
    }
}

if(videoArrayIndex){
    if(!isNaN(result.results[videoArrayIndex].packetsLost/result.results[videoArrayIndex].packetsSent)){
        averageVideoPacketLossArray.push(result.results[videoArrayIndex].packetsLost/result.results[videoArrayIndex].packetsSent);
    }
}

/*function getSum(total, num) {
    return total + num;
}*/
  /*window.getStatsResult = result;
    //console.log("Results --> ",result);
}

function bytesToSize(bytes) {
    var bits=bytes*8;
    var k = 1000;
    var sizes = ['Bits', 'Kb', 'Mb', 'Gb', 'Tb']; //no i18n
    if (bits <= 0) {
        return '0 Bits'; //no i18n
    }
    var i = parseInt(Math.floor(Math.log(bits) / Math.log(k)), 10);
    if(!sizes[i]) {
        return '0 Bits'; //no i18n
    }
    return (bits / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i];
}

z_pub_test.Events.onFailure = function(failure){

    var handle = failure.handle;
    var reason = failure.reason;
    if(reason=="iceFailed"){
        var isIceFail = true;
        var mediaConstraints = {};
        mediaConstraints.iceRestart = true;
        z_pub_test.restartNegotiation(handle,mediaConstraints,isIceFail);
    }
}

z_pub_test.Events.onSignalingStateChange = function(object){
    var handle = object.handle;
    var signalingState = object.signalingState;
    handleChangeInSignalingState(handle,signalingState);
}

z_pub_test.Errors.onError = function(error){
    var messageObj = {};
    messageObj.title = "Oops!";//no i18n
    messageObj.content = error.error;
    openModalDialog("error",messageObj);//no i18n
}

z_pub_test.Events.onVideoPlayBackFailure = function(errObj){
    var element = errObj.element;
    var videoId = element.id;
    var pluginId = videoId.substring(videoId.indexOf('-')+1);
    // element.controls = true;
    var videoFailDiv = document.getElementById("callbackfail-"+pluginId);
    if(videoFailDiv && videoFailDiv.classList.contains('d-none-imp')){
        videoFailDiv.classList.remove('d-none-imp'); //no i18n
    }
}

z_pub_test.Events.onVideoPlayBackSuccess = function(){
    layout.layout();
}
}*/

  win.initConference = function(medCh, connection) {
    let medConf = medCh.initConference(connection);
    med_conf = medConf;
    let streams = [];
    medConf.Events.onInit = function(resp) {
      medConf.join();
    };

    medConf.Events.onJoin = function(confInstance) {
      //            try{
      let pluginModule = window.constructModule(
        'ST',
        medConf.pluginId,
        'medConf',
        new Date().getTime(),
        { userId: userId },
        null
      ); //no i18n
      let parentModule = window.findMiniModule(module, 'session'); //no i18n
      window.pushMiniModule(parentModule, pluginModule);
      //            }catch(e){
      ////                console.log("e",e);
      //            }
      if (!subscriberOnly) {
        let userPermission = checkIfUserHasPermission(userObj, 'publish'); //no i18n
        if (userPermission != 'false') {
          //testNetwork(medConf,confInstance);
          //                    console.log("initing publisher");
          initPublishers(medConf, confInstance);
        } else {
          let messageObj = {};
          messageObj.title = 'Sorry!'; //no i18n
          messageObj.content =
            'You do not have the necessary permissions to publish your screen. Contact the Host for more details.'; //no i18n
          openModalDialog('publish', messageObj, null, null); //no i18n
        }
      }
    };

    medConf.Events.onStream = function(stream) {
      streams.push(stream);
      let userPermission = checkIfUserHasPermission(userObj, 'subscribe'); //no i18n
      if (userPermission != 'false') {
        initSubscribers(medConf, stream);
      }
    };

    medConf.Events.onStreamDestroyed = function(handle) {
      handle.closeMyPeerConnection(handle);
      destroyElement(handle);
      if (
        (handle.source == 2 || handle.source == 3) &&
        handle.handleType == 1
      ) {
        media_channel.screenShareHandles.shift();
        if (whiteboard && media_channel.canvasHandler) {
          let promise = new Promise((resolve, reject) => {
            let workerData = {};
            workerData.action = 'stop';
            media_channel.canvasHandler.canvasWorkerAction(
              workerData,
              resolve,
              reject
            );
          });
          promise.then(() => {
            media_channel.canvasHandler = undefined;
          });
          let span = document.getElementById('annotate-tag');
          span.innerHTML = 'annotate'; //no i18n
        }
      }
      handle.isStreamDestroyed = true;
      layout.layout();
    };

    medConf.Events.onCreateVideoElement = function(self) {
      createVideoElement(self);
    };

    return medConf;
  };

  win.sendMsg = function(form) {
    if (form.msg.value.trim() == '') {
      return false;
    }
    if (cmServer) {
      cmServer.sendMessage(
        userId,
        cmServer.cs_proto.MessageEvents.SEND_MESSAGE,
        form.msg.value,
        { roomId: roomId },
        cmServer.cs_proto.EventPipeLines.MESSAGE
      ); //no i18n
    }
    form.msg.value = '';
    return false;
  };

  win.addChat = function(data) {
    let responseJSON = data;
    let appProperty = JSON.parse(data.appProperty);
    let singlechat = document.createElement('li');
    singlechat.className = 'single-chat';
    //            singlechat.id = responseJSON.fromUser+'-chat';

    let singlechatinside = document.createElement('div');
    singlechatinside.className = 'single-chat-inside';

    let chatavatar = document.createElement('div');
    chatavatar.className = 'chat-avatar';
    chatavatar.style =
      'background-image: url(/images/annon-user-thumbnail.png);';

    let singlechatmeta = document.createElement('div');
    singlechatmeta.className = 'single-chat-meta';

    let h6 = document.createElement('h6');
    h6.innerHTML = textify(appProperty.name); //+'-'+responseJSON.user;

    let time = document.createElement('span');
    time.className = 'time';
    time.innerHTML = new Date(parseInt(responseJSON.time)).toLocaleString();

    let chatdetail = document.createElement('div');
    chatdetail.className = 'chat-detail';
    chatdetail.innerHTML = textify(responseJSON.message);

    h6.appendChild(time);

    singlechatmeta.appendChild(h6);
    singlechatmeta.appendChild(chatdetail);

    singlechatinside.appendChild(chatavatar);
    singlechatinside.appendChild(singlechatmeta);

    singlechat.appendChild(singlechatinside);

    let el = document.getElementById('add-chat-here');
    el.appendChild(singlechat);

    addPulseToColumn(1);
    let userAction = false;
    if (responseJSON.fromUser == userId) {
      userAction = true;
    }
    let message = `${appProperty.name} says ${responseJSON.message}`; //no i18n
    notifyMe('new Message', message); //no i18n
    // checkAndScroll(userAction);
  };

  //publisher object

  win.initPublishers = function(medConf, confInstance) {
    let { browser } = media_channel.webRTCAdapter.browserDetails;
    try {
      let audioInURL = decodeURIComponent(
        window.location.search.replace(
          new RegExp(
            `^(?:.*[&\\?]${encodeURIComponent('audio').replace(
              /[\.\+\*]/g,
              '\\$&'
            )}(?:\\=([^&]*))?)?.*$`,
            'i'
          ),
          '$1'
        )
      );
      let videoInURL = decodeURIComponent(
        window.location.search.replace(
          new RegExp(
            `^(?:.*[&\\?]${encodeURIComponent('video').replace(
              /[\.\+\*]/g,
              '\\$&'
            )}(?:\\=([^&]*))?)?.*$`,
            'i'
          ),
          '$1'
        )
      );
      if (!medConf) {
        medConf = med_conf;
      }
      let hasAudio = false;
      let hasVideo = false;
      if (audioInURL != 'none') {
        hasAudio = true;
      }
      if (videoInURL != 'none') {
        hasVideo = true;
      }
      if (browser == 'firefox') {
        var z_pub = medConf.initPublisher(
          {
            audio: hasAudio,
            video: hasVideo,
            simulcast: doSimulcast,
            isTestPage: false,
            bitrate: 2048000
          },
          { source: 1, audio: audioInURL, video: videoInURL }
        );
      } else {
        var z_pub = medConf.initPublisher(
          {
            audio: hasAudio,
            video: hasVideo,
            simulcast: doSimulcast,
            isTestPage: false,
            bitrate: 2048000
          },
          { source: 1, audio: audioInURL, video: videoInURL }
        );
      }
      z_pub.Events.onInit = function(publisher) {
        z_pub.publish();
      };

      z_pub.Events.onStreamCreated = function(obj) {
        let { stream } = obj;
        let { plugin } = obj;
        let pubModule = window.constructModule(
          'ST',
          plugin.pluginId,
          'publisher',
          new Date().getTime(),
          { source: plugin.source, userId: plugin.userId },
          null
        ); //no i18n
        let parentModule = window.findMiniModule(module, 'session'); //no i18n
        window.pushMiniModule(parentModule, pubModule);
        let eleme = document.getElementById(`sub-${plugin.pluginId}`);
        if (eleme) {
          media_channel.attachMediaStream(eleme, stream, plugin);
          plugin.liveStream = true;
        }
      };

      z_pub.Events.onUnpublish = function() {
        // enableBlackScreen(z_pub);
        // setTimeout(function(){
        //     z_pub.publish();
        // },5000)
        return;
      };

      z_pub.Events.onPublish = function() {
        layout.layout();
        // if(z_pub.source == 2 || z_pub.source == 3){
        //     toggleScreenShareButton(z_pub);
        // }
        // disableBlackScreen(z_pub);
        if (!z_pub.webrtcCORE.webrtcUP) {
          z_pub.publishTimer = setTimeout(() => {
            let messageObj = {};
            messageObj.title = 'Oops!'; //no i18n
            messageObj.content = 'Failed to publish stream.'; //no i18n
            messageObj.resolveBy = 'rePublish(1)'; //no i18n
            messageObj.resolveMsg = 'Try again.'; //no i18n
            z_pub.detachHandle();
            openModalDialog('error', messageObj); //no i18n
          }, 5000);
        }
      };

      z_pub.Events.onWebrtcup = function() {
        // if(z_pub.publishTimer){
        //     clearTimeout(z_pub.publishTimer);
        // }
      };

      z_pub.Events.onAudioVideoPropertyChange = function(options) {
        handleAudioVideoPropertyChange(options.plugin, options);
      };

      z_pub.Events.onFailure = function(failure) {
        let { handle } = failure;
        let { reason } = failure;
        if (reason == 'iceFailed') {
          let isIceFail = true;
          let mediaConstraints = {};
          mediaConstraints.iceRestart = true;
          // var promise = new Promise(function(resolve,reject){
          //     var audioInURL = decodeURIComponent(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent("audio").replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
          //     var videoInURL = decodeURIComponent(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent("video").replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
          //     var promise1 = new Promise(function(resolve1,reject1){
          //         if(audioInURL!="none" && handle.webrtcCORE.options.audio == false){
          //             handle.toggleAudio(resolve1,reject1);
          //         }else{
          //             resolve1();
          //         }
          //     })
          //     promise1.then(function(resolved1){
          //         var promise2 = new Promise(function(resolve2,reject2){
          //             if(videoInURL!="none" && handle.webrtcCORE.options.video == false){
          //                 handle.toggleVideo(resolve2,reject2);
          //             }else{
          //                 resolve2();
          //             }
          //         })
          //         promise2.then(function(resolved2){
          //             setAudioVideoParams(resolve,reject);
          //         },function(rejected2){
          //
          //         })
          //     },function(rejected1){
          //
          //     })
          // });
          // promise.then(function(resolvedAs){
          z_pub.restartNegotiation(handle, mediaConstraints, isIceFail);
          // },function(err){
          //
          // })
        } else if (reason == 'mute/unmute') {
          //not used. moved to on error //no i18n
          let messageObj = {};
          messageObj.title = 'Oops!'; //no i18n
          if (failure.message) {
            messageObj.content = failure.message;
          } else {
            messageObj.content = 'Failed to publish stream.'; //no i18n
          }
          openModalDialog('error', messageObj); //no i18n
        }
      };

      z_pub.Events.onTalking = function() {
        //            if(document.getElementById("talking-"+z_pub.pluginId)) {
        //                document.getElementById("talking-" + z_pub.pluginId).classList.remove("d-none-imp"); //no i18n
        //            }
      };

      z_pub.Events.onStoppedTalking = function() {
        // if(!document.getElementById("talking-"+z_pub.pluginId).classList.contains("d-none-imp")){
        //     document.getElementById("talking-"+z_pub.pluginId).classList.add("d-none-imp"); //no i18n
        // }
      };

      z_pub.Events.onSignalingStateChange = function(object) {
        let { handle } = object;
        let { signalingState } = object;
        handleChangeInSignalingState(handle, signalingState);
      };

      z_pub.Errors.onError = function(error) {
        let messageObj = {};
        messageObj.title = 'Oops!'; //no i18n
        messageObj.content = error.error;
        openModalDialog('error', messageObj); //no i18n
      };

      z_pub.Events.onVideoPlayBackFailure = function(errObj) {
        let { element } = errObj;
        let videoId = element.id;
        let pluginId = videoId.substring(videoId.indexOf('-') + 1);
        // element.controls = true;
        let videoFailDiv = document.getElementById(`callbackfail-${pluginId}`);
        if (videoFailDiv && videoFailDiv.classList.contains('d-none-imp')) {
          videoFailDiv.classList.remove('d-none-imp'); //no i18n
        }
      };

      z_pub.Events.onVideoPlayBackSuccess = function() {
        layout.layout();
      };

      z_pub.Events.onStreamFromClient = function(resp) {
        let { type } = resp;
        let { receiving } = resp;
        if (type == 'audio') {
          if (receiving == true || receiving == 'true') {
            if (z_pub.publishTimer) {
              clearTimeout(z_pub.publishTimer);
            }
          }
          //                    else if(receiving == false || receiving == "false"){
          //                        // var messageObj = {};
          //                        // messageObj.title = "Oops!";//no i18n
          //                        // messageObj.content = "Failed to publish audio."; //no i18n
          //                        // messageObj.resolveBy = "detachrePublish(1,this.id)"; //no i18n
          //                        // messageObj.resolveMsg = "Try again.";//no i18n
          //                        // messageObj.handleObj  =z_pub;
          //                        // // z_pub.detachHandle();
          //                        // openModalDialog("error",messageObj);//no i18n
          //                    }
        } else if (type == 'video') {
          //no i18n
          if (receiving == true || receiving == 'true') {
            if (z_pub.publishTimer) {
              clearTimeout(z_pub.publishTimer);
            }
          }
          //                    else if(receiving == false || receiving == "false"){
          //                        // var messageObj = {};
          //                        // messageObj.title = "Oops!";//no i18n
          //                        // messageObj.content = "Failed to publish video."; //no i18n
          //                        // messageObj.resolveBy = "detachrePublish(1,this.id)"; //no i18n
          //                        // messageObj.resolveMsg = "Try again.";//no i18n
          //                        // messageObj.handleObj  =z_pub;
          //                        // // z_pub.detachHandle();
          //                        // openModalDialog("error",messageObj);//no i18n
          //                    }
        }
      };
    } catch (e) {
      //            console.log("e",e);
    }
  };

  win.handleChangeInSignalingState = function(handle, signalingState) {
    let { pluginId } = handle;
    let buttons = [];
    if (handle.handleType == 1) {
      let mic = document.getElementById(`${pluginId}-mic`);
      let cam = document.getElementById(`${pluginId}-cam`);
      let deviceChange = document.getElementById(`${pluginId}-device-change`);
      buttons.push(mic, cam, deviceChange);
    } else if (handle.handleType == 2) {
      let canvasClear = document.getElementById(`${pluginId}-canvas-clear`);
      let canvasRedo = document.getElementById(`${pluginId}-canvas-redo`);
      let canvasUndo = document.getElementById(`${pluginId}-canvas-undo`);
      let canvasStart = document.getElementById(`${pluginId}-canvas-start`);
      buttons.push(canvasClear, canvasRedo, canvasUndo, canvasStart);
    }
    if (
      signalingState == 'have-remote-offer' ||
      signalingState == 'have-local-offer' ||
      signalingState == 'closed'
    ) {
      buttons.forEach(button => {
        if (button && !button.classList.contains('not-active')) {
          button.classList.add('not-active'); //no i18n
        }
      });
    } else if (signalingState == 'stable') {
      //no i18n
      buttons.forEach(button => {
        if (button && button.classList.contains('not-active')) {
          button.classList.remove('not-active'); //no i18n
        }
      });
    }
  };

  win.selectDevice = function(thisid, value) {
    let promise = new Promise((resolve, reject) => {
      constructConstraints(resolve, reject);
    });
    promise.then(
      resolvedAs => {},
      error => {
        let audioInUrl = document.getElementById('audio-select').dataset
          .pselected;
        let videoInUrl = document.getElementById('video-select').dataset
          .pselected;
        document.getElementById(audioInUrl).selected = true;
        document.getElementById(videoInUrl).selected = true;
        document
          .getElementById('audio-select')
          .setAttribute('data-selected', audioInUrl);
        document
          .getElementById('video-select')
          .setAttribute('data-selected', videoInUrl);
        selectDevice();
      }
    );
  };

  win.changeDevice = function(id) {
    let pluginId = id.substring(0, id.indexOf('-'));
    let audioInputDevices = [];
    let videoInputDevices = [];
    navigator.mediaDevices
      .enumerateDevices()
      .then(devices => {
        devices.forEach(device => {
          if (device.kind == 'audioinput') {
            var _deviceData = { kind: device.kind, deviceId: device.deviceId };
            if (device.label && device.label.length > 0) {
              _deviceData.name = device.label;
            } else {
              _deviceData.name = `Audio Device-${audioInputDevices.length + 1}`;
            }
            audioInputDevices.push(_deviceData);
          }
          if (device.kind == 'videoinput') {
            var _deviceData = { kind: device.kind, deviceId: device.deviceId };
            if (device.label && device.label.length > 0) {
              _deviceData.name = device.label;
            } else {
              _deviceData.name = `Video Device-${videoInputDevices.length + 1}`;
            }
            videoInputDevices.push(_deviceData);
          }
        });
        constructConstraints();
        let audioSelect = document.getElementById('audio-select');
        let videoSelect = document.getElementById('video-select');
        let selectedAudio = audioSelect.dataset.selected;
        let selectedVideo = videoSelect.dataset.selected;
        let audioOptions = audioSelect.options;
        let videoOptions = videoSelect.options;
        for (var i = audioOptions.length - 1; i >= 0; i--) {
          audioSelect.remove(i);
        }
        for (var i = videoOptions.length - 1; i >= 0; i--) {
          videoSelect.remove(i);
        }
        reRender(1, audioInputDevices, selectedAudio);
        reRender(2, videoInputDevices, selectedVideo);
        document.getElementById('user-form').classList.remove('d-none'); //no i18n
        document
          .getElementById('user-form-close')
          .classList.remove('d-none-imp'); //no i18n
        document.getElementById('user-form').dataset.openedby = pluginId;
        let el = document.getElementById('device-form').querySelector('h3'); //no i18n
        if (el) {
          el.innerHTML = 'Choose device';
        } //no i18n
        document.body.addEventListener('keydown', bindEscape);
      })
      .catch(err => {
        //                console.log(err.name + ": " + err.message);
      });
  };

  win.reRender = function(type, deviceList, selectedDevice) {
    let el = document.createElement('option');
    el.text = 'none'; //no i18n
    el.value = 'none'; //no i18n
    el.disabled = true;
    if (type == 1) {
      //audio
      var select = document.getElementById('audio-select');
      el.id = 'none-audio';
      if (selectedDevice == el.id) {
        el.selected = true;
      }
    } else if (type == 2) {
      select = document.getElementById('video-select');
      el.id = 'none-video';
      if (selectedDevice == el.id) {
        el.selected = true;
      }
    }
    select.appendChild(el);
    let options = deviceList;
    if (options.length > 0) {
      options.forEach(option => {
        let opt = option;
        let el = document.createElement('option');
        el.text = opt.name;
        el.value = opt.deviceId;
        el.id = opt.deviceId;
        if (selectedDevice == opt.deviceId) {
          el.selected = true;
        }
        select.appendChild(el);
      });
    }
  };

  win.mirrorVideo = function(id) {
    let pluginId = id.substring(0, id.indexOf('-'));
    let video = document.getElementById(`sub-${pluginId}`);
    if (video) {
      if (video.classList.contains('mirror')) {
        video.classList.remove('mirror'); //no i18n
      } else {
        video.classList.add('mirror'); //no i18n
      }
    }
  };

  win.bindEscape = function(e) {
    if (e.key == 'Escape') {
      if (!document.getElementById('user-form').classList.contains('d-none')) {
        stopTracks('preview-video'); //no i18n
        document.getElementById('user-form').classList.add('d-none'); //no i18n
        let audioInUrl = document.getElementById('audio-select').dataset
          .pselected;
        let videoInUrl = document.getElementById('video-select').dataset
          .pselected;
        document.getElementById(audioInUrl).selected = true;
        document.getElementById(videoInUrl).selected = true;
        document.getElementById('audio-select').setAttribute('data-selected');
        document
          .getElementById('video-select')
          .setAttribute('data-selected', videoInUrl);
      }
      if (
        !document.getElementById('modalDialog').classList.contains('d-none-imp')
      ) {
        document.getElementById('modalDialog').classList.add('d-none-imp'); //no i18n
      }
      if (
        !document
          .getElementById('modalbackdrop')
          .classList.contains('d-none-imp')
      ) {
        document.getElementById('modalbackdrop').classList.add('d-none-imp'); //no i18n
      }
      document.body.removeEventListener('keydown', bindEscape);
    }
  };

  win.startRenegotiation = function() {
    let pluginId = document.getElementById('user-form').dataset.openedby;
    let handle;
    media_channel.allHandles.find(_handle => {
      if (_handle.pluginId == pluginId) {
        handle = _handle;
      }
    });
    document.getElementById('user-form').classList.add('d-none'); //no i18n
    let promise = new Promise((resolve, reject) => {
      //     var audioInURL = decodeURIComponent(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent("audio").replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
      //     var videoInURL = decodeURIComponent(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent("video").replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
      //     var promise1 = new Promise(function(resolve1,reject1){
      //         if(audioInURL!="none" && handle.webrtcCORE.options.audio == false){
      //             handle.toggleAudio(resolve1,reject1);
      //         }else{
      //             resolve1();
      //         }
      //     })
      //     promise1.then(function(resolved1){
      //         var promise2 = new Promise(function(resolve2,reject2){
      //             if(videoInURL!="none" && handle.webrtcCORE.options.video == false){
      //                 handle.toggleVideo(resolve2,reject2);
      //             }else{
      //                 resolve2();
      //             }
      //         })
      //         promise2.then(function(resolved2){
      setAudioVideoParams(resolve, reject);
      //         },function(rejected2){
      //
      //         })
      //     },function(rejected1){
      //
      //     })
    });
    promise.then(
      resolve => {
        if (resolve.audioChanged || resolve.videoChanged) {
          if (handle) {
            let { audioChanged } = resolve;
            let { videoChanged } = resolve;
            let { audioAction } = resolve;
            let { videoAction } = resolve;
            let mediaConstraints = {};
            mediaConstraints.audio = resolve.audioSelectedValue;
            mediaConstraints.video = resolve.videoSelectedValue;
            mediaConstraints.isAudioChanged = audioChanged;
            mediaConstraints.isVideoChanged = videoChanged;
            if (videoChanged) {
              if (videoAction == 3) {
                mediaConstraints.removeVideo = true;
              } else if (videoAction == 2) {
                mediaConstraints.replaceVideo = true;
              } else if (videoAction == 1) {
                mediaConstraints.addVideo = true;
              }
              // else if(videoAction == 0){
              //kadal layae ilayaam
              // mediaConstraints.iceRestart = true;
              // }
            }
            if (audioChanged) {
              if (audioAction == 3) {
                mediaConstraints.removeAudio = true;
              } else if (audioAction == 2) {
                mediaConstraints.replaceAudio = true;
              } else if (audioAction == 1) {
                mediaConstraints.addAudio = true;
              }
              // else if(audioAction == 0){
              //kadal layae ilayaam
              // mediaConstraints.iceRestart = true;
              // }
            }
            handle.restartNegotiation(handle, mediaConstraints);
          }
        }
      },
      error => {
        //            console.log("error",error);
      }
    );
  };

  //screenshare handling

  win.createNewScreenSharePublihser = function() {
    let source = 2;
    //         if(needAuxillaryFeature){
    //             source = 3;
    //             var stream = new Promise(function(resolve,reject){
    //                 getStreamForScribbling(resolve); //got stream from screen share and a video element has also been created.
    //             })
    //             stream.then(function(response){
    //                 var _stream=response;
    //                 var options = {
    //                     audio:false,
    //                     video:true,
    //                     stream:_stream
    //                 }
    //                 var z_pub = med_conf.initPublisher(options,{source:source});
    //                 z_pub.Events.onInit = function(publisher){
    //                     z_pub.publish();
    //                 }
    //
    //                 z_pub.Events.onStreamCreated = function(stream){
    //                     var pubModule = window.constructModule("ST",z_pub.pluginId,"publisher",new Date().getTime(),{'source':z_pub.source,'userId':z_pub.userId},null); //no i18n
    //                     var parentModule = window.findMiniModule(module,"session"); //no i18n
    //                     window.pushMiniModule(parentModule,pubModule);
    //                     var eleme = document.getElementById("sub-"+z_pub.pluginId);
    //                     if(eleme){
    //                         media_channel.attachMediaStream(eleme,stream);
    //                         z_pub.liveStream = true;
    //                     }
    //
    //                 }
    //
    //                 z_pub.Events.onUnpublish = function(){
    //                     enableBlackScreen(z_pub);
    //                     setTimeout(function(){
    //                         z_pub.publish();
    //                     },5000)
    //                     return;
    //                 }
    //
    //                 z_pub.Events.onPublish = function(){
    //                     disableBlackScreen(z_pub);
    //                     if(z_pub.source == 2 || z_pub.source == 3){
    //                         toggleScreenShareButton(z_pub);
    //                     }
    //                 }
    //
    //                 z_pub.Events.onAudioVideoPropertyChange = function(options){
    //                     handleAudioVideoPropertyChange(options.plugin,options);
    //                 }
    //
    //                 z_pub.Events.onFailure = function(failure){
    //                     var handle = failure.handle;
    //                     var reason = failure.reason;
    //                     if(reason=="iceFailed"){
    // //                            handle.closeMyPeerConnection(handle);
    // //                            window.alert("iceStateFailed for Publisher handle. Reload to try again"); //no i18n
    // //                            handle.unpublish();
    //                         var isIceFail = true;
    //                         var mediaConstraints = {};
    //                         mediaConstraints.iceRestart = true;
    //                         var promise = new Promise(function(resolve,reject){
    //                             var audioInURL = decodeURIComponent(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent("audio").replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
    //                             var videoInURL = decodeURIComponent(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent("video").replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
    //                             var promise1 = new Promise(function(resolve1,reject1){
    //                                 if(audioInURL!="none" && handle.webrtcCORE.options.audio == false){
    //                                     handle.toggleAudio(resolve1,reject1);
    //                                 }else{
    //                                     resolve1();
    //                                 }
    //                             })
    //                             promise1.then(function(resolved1){
    //                                 var promise2 = new Promise(function(resolve2,reject2){
    //                                     if(videoInURL!="none" && handle.webrtcCORE.options.video == false){
    //                                         handle.toggleVideo(resolve2,reject2);
    //                                     }else{
    //                                         resolve2();
    //                                     }
    //                                 })
    //                                 promise2.then(function(resolved2){
    //                                     setAudioVideoParams(resolve,reject);
    //                                 },function(rejected2){
    //
    //                                 })
    //                             },function(rejected1){
    //
    //                             })
    //                         });
    //                         promise.then(function(resolvedAs){
    //                             z_pub.restartNegotiation(handle,mediaConstraints,isIceFail);
    //                         },function(err){
    //
    //                         })
    //                     }
    //                 }
    //
    //                 z_pub.Events.onTalking = function(){
    //                     document.getElementById("talking-"+z_pub.pluginId).classList.remove("d-none-imp"); //no i18n
    //                 }
    //
    //                 z_pub.Events.onStoppedTalking = function(){
    //                     if(!document.getElementById("talking-"+z_pub.pluginId).classList.contains("d-none-imp")){
    //                         document.getElementById("talking-"+z_pub.pluginId).classList.add("d-none-imp"); //no i18n
    //                     }
    //                 }
    //             })
    //         }else{
    let userPermission = checkIfUserHasPermission(userObj, 'screenshare'); //no i18n
    if (userPermission != 'false' || canPublish == 'true') {
      let z_pub = med_conf.initPublisher(
        { audio: false, video: true },
        { source: source }
      );
      z_pub.Events.onInit = function(publisher) {
        z_pub.webrtcCORE.screenShareInProgress = true;
        toggleScreenShareButton(z_pub);
        z_pub.publish();
      };

      z_pub.Events.onStreamCreated = function(obj) {
        let { stream } = obj;
        let { plugin } = obj;
        let pubModule = window.constructModule(
          'ST',
          plugin.pluginId,
          'publisher',
          new Date().getTime(),
          { source: plugin.source, userId: plugin.userId },
          null
        ); //no i18n
        let parentModule = window.findMiniModule(module, 'session'); //no i18n
        window.pushMiniModule(parentModule, pubModule);
        let eleme = document.getElementById(`sub-${plugin.pluginId}`);
        if (eleme) {
          media_channel.attachMediaStream(eleme, stream, plugin);
          plugin.liveStream = true;
        }
      };

      z_pub.Events.onUnpublish = function() {
        // enableBlackScreen(z_pub);
        setTimeout(() => {
          z_pub.publish();
        }, 5000);
        return;
      };

      z_pub.Events.onPublish = function() {
        // disableBlackScreen(z_pub);
        layout.layout();
        // if(z_pub.source == 2 || z_pub.source == 3){
        //     toggleScreenShareButton(z_pub);
        // }
        if (!z_pub.webrtcCORE.webrtcUP) {
          z_pub.publishTimer = setTimeout(() => {
            let messageObj = {};
            messageObj.title = 'Oops!'; //no i18n
            messageObj.content = 'Failed to Share screen.'; //no i18n
            messageObj.resolveBy = 'rePublish(2)'; //no i18n
            messageObj.resolveMsg = 'Try again.'; //no i18n
            z_pub.detachHandle();
            openModalDialog('error', messageObj); //no i18n
          }, 5000);
        }
      };

      z_pub.Events.onWebrtcup = function() {
        // if(z_pub.publishTimer){
        //     clearTimeout(z_pub.publishTimer);
        // }
      };

      z_pub.Events.onAudioVideoPropertyChange = function(options) {
        handleAudioVideoPropertyChange(options.plugin, options);
      };

      z_pub.Events.onFailure = function(failure) {
        let { handle } = failure;
        let { reason } = failure;
        if (reason == 'iceFailed') {
          let isIceFail = true;
          let mediaConstraints = {};
          mediaConstraints.iceRestart = true;
          // var promise = new Promise(function(resolve,reject){
          //     var audioInURL = decodeURIComponent(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent("audio").replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
          //     var videoInURL = decodeURIComponent(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent("video").replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
          //     var promise1 = new Promise(function(resolve1,reject1){
          //         if(audioInURL!="none" && handle.webrtcCORE.options.audio == false){
          //             handle.toggleAudio(resolve1,reject1);
          //         }else{
          //             resolve1();
          //         }
          //     })
          //     promise1.then(function(resolved1){
          //         var promise2 = new Promise(function(resolve2,reject2){
          //             if(videoInURL!="none" && handle.webrtcCORE.options.video == false){
          //                 handle.toggleVideo(resolve2,reject2);
          //             }else{
          //                 resolve2();
          //             }
          //         })
          //         promise2.then(function(resolved2){
          //             setAudioVideoParams(resolve,reject);
          //         },function(rejected2){
          //
          //         })
          //     },function(rejected1){
          //
          //     })
          // });
          // promise.then(function(resolvedAs){
          z_pub.restartNegotiation(handle, mediaConstraints, isIceFail);
          // },function(err){

          // })
        }
      };

      z_pub.Events.onTalking = function() {
        //                if(document.getElementById("talking-"+z_pub.pluginId)) {
        //                    document.getElementById("talking-" + z_pub.pluginId).classList.remove("d-none-imp"); //no i18n
        //                }
      };

      z_pub.Events.onStoppedTalking = function() {
        if (
          document.getElementById(`talking-${z_pub.pluginId}`) &&
          !document
            .getElementById(`talking-${z_pub.pluginId}`)
            .classList.contains('d-none-imp')
        ) {
          document
            .getElementById(`talking-${z_pub.pluginId}`)
            .classList.add('d-none-imp'); //no i18n
        }
      };

      z_pub.Events.onSignalingStateChange = function(object) {
        let { handle } = object;
        let { signalingState } = object;
        handleChangeInSignalingState(handle, signalingState);
      };

      z_pub.Errors.onError = function(error) {
        let messageObj = {};
        messageObj.title = 'Oops!'; //no i18n
        messageObj.content = error.error;
        if (error.resolveBy) {
          messageObj.resolveBy = error.resolveBy;
          messageObj.resolveMsg = error.resolveMsg;
        }
        openModalDialog('error', messageObj); //no i18n
      };

      z_pub.Events.onVideoPlayBackFailure = function(errObj) {
        let { element } = errObj;
        let videoId = element.id;
        let pluginId = videoId.substring(videoId.indexOf('-') + 1);
        // element.controls = true;
        let videoFailDiv = document.getElementById(`callbackfail-${pluginId}`);
        if (videoFailDiv && videoFailDiv.classList.contains('d-none-imp')) {
          videoFailDiv.classList.remove('d-none-imp'); //no i18n
        }
      };

      z_pub.Events.onVideoPlayBackSuccess = function() {
        layout.layout();
      };

      z_pub.Events.onStreamFromClient = function(resp) {
        let { type } = resp;
        let { receiving } = resp;
        if (type == 'audio') {
          if (receiving == true || receiving == 'true') {
            if (z_pub.publishTimer) {
              clearTimeout(z_pub.publishTimer);
            }
          }
          //                    else if(receiving == false || receiving == "false"){
          //                        // var messageObj = {};
          //                        // messageObj.title = "Oops!";//no i18n
          //                        // messageObj.content = "Failed to publish audio."; //no i18n
          //                        // messageObj.resolveBy = "detachrePublish(1,this.id)"; //no i18n
          //                        // messageObj.resolveMsg = "Try again.";//no i18n
          //                        // messageObj.handleObj  =z_pub;
          //                        // // z_pub.detachHandle();
          //                        // openModalDialog("error",messageObj);//no i18n
          //                    }
        } else if (type == 'video') {
          //no i18n
          if (receiving == true || receiving == 'true') {
            if (z_pub.publishTimer) {
              clearTimeout(z_pub.publishTimer);
            }
          }
          //                    else if(receiving == false || receiving == "false"){
          //                        // var messageObj = {};
          //                        // messageObj.title = "Oops!";//no i18n
          //                        // messageObj.content = "Failed to publish video."; //no i18n
          //                        // messageObj.resolveBy = "detachrePublish(1,this.id)"; //no i18n
          //                        // messageObj.resolveMsg = "Try again.";//no i18n
          //                        // messageObj.handleObj  =z_pub;
          //                        // // z_pub.detachHandle();
          //                        // openModalDialog("error",messageObj);//no i18n
          //                    }
        }
      };
    } else {
      let messageObj = {};
      messageObj.title = 'Sorry!'; //no i18n
      messageObj.content =
        'You do not have the necessary permissions to share your screen. Contact the Host for more details.'; //no i18n
      openModalDialog('screenshare', messageObj, null, null); //no i18n
    }
    // }
  };

  win.toggleScreenShare = function(e) {
    if (whiteboard) {
      if (media_channel.canvasHandler) {
        //                    clearTimeout(media_channel.canvasHandler.canvasTimeOut);
        let promise = new Promise((resolve, reject) => {
          let workerData = {};
          workerData.action = 'stop';
          media_channel.canvasHandler.canvasWorkerAction(
            workerData,
            resolve,
            reject
          );
        });
        promise.then(() => {
          media_channel.canvasHandler = undefined;
        });
      }
    }
    if (media_channel.screenShareHandles.length > 0) {
      for (let k in media_channel.screenShareHandles) {
        if (
          media_channel.screenShareHandles[k].source == 2 ||
          media_channel.screenShareHandles[k].source == 3
        ) {
          let publisher = media_channel.screenShareHandles[k];
          if (publisher.webrtcCORE.screenShareInProgress == true) {
            publisher.closeMyPeerConnection(publisher);
            publisher.detachHandle();
            media_channel.screenShareHandles.shift();
          } else {
            media_channel.screenShareHandles.shift();
          }
        }
      }
    } else {
      createNewScreenSharePublihser();
    }
  };

  win.toggleScreenShareButton = function(z_pub) {
    if (document.getElementById('screensharebutton')) {
      if (z_pub && z_pub.webrtcCORE.screenShareInProgress == true) {
        document.getElementById('screensharebutton').innerHTML =
          'Stop ScreenShare'; //no i18n
      } else {
        document.getElementById('screensharebutton').innerHTML =
          'Start ScreenShare'; //no i18n
      }
    }
  };

  win.createCanvas = function(id) {
    let pluginId = id.substring(0, id.indexOf('-'));
    if (document.getElementById(id).innerHTML == 'Draw') {
      window.checkAndCreateCanvas(parseInt(id), true, userId, true);
      let element = document.getElementById(id);
      //            element.parentNode.removeChild(element);
      document.getElementById(id).innerHTML = 'Stop'; //no i18n
    } else {
      window.removeThisCanvasListeners(pluginId);
      document.getElementById(id).innerHTML = 'Draw'; //no i18n
    }
  };

  win.undoCanvas = function(id) {
    let pluginId = id.substring(0, id.indexOf('-'));
    window.undoCanvasAction(parseInt(id));
  };

  win.clearCanvas = function(id) {
    let pluginId = id.substring(0, id.indexOf('-'));
    window.clearAllAction(parseInt(id));
  };

  win.redoCanvas = function(id) {
    let pluginId = id.substring(0, id.indexOf('-'));
    window.redoCanvasAction(parseInt(id));
  };

  win.capture = function(id) {
    let pluginId = id.substring(0, id.indexOf('-'));
    window.captureFrame(parseInt(id));
  };

  //subscriber objects

  win.initSubscribers = function(medConf, stream) {
    let subscriber = medConf.subscribe(stream);
    let talkingTimeOutArray = [];
    subscriber.Events.onAudioVideoPropertyChange = function(options) {
      handleAudioVideoPropertyChange(options.plugin, options);
    };
    subscriber.Events.onFailure = function(failure) {
      let { handle } = failure;
      let { reason } = failure;
      handle.detachHandle(); //if janus has failed messaging server is to be notified. Based on this, client side is to be rewrked.
      // if(!handle.detached){
      if (reason == 'iceFailed') {
        let stream = {};
        stream.id = handle.streamId;
        if (handle.source == 1) {
          stream.publisherSource = 'camera'; //no i18n
        } else if (handle.source == 2) {
          stream.publisherSource = 'screen'; //no i18n
        }
        initSubscribers(medConf, stream);
        // if janus hasn't failed, we can restart connection here.
      }
      // }
    };
    subscriber.Events.onJoin = function() {
      let subscriberObj = window.constructModule(
        'ST',
        subscriber.pluginId,
        'subscriber',
        new Date().getTime(),
        { source: subscriber.source, userId: subscriber.userId },
        null
      ); //no i18n
      let parentModule = window.findMiniModule(module, 'session'); //no i18n
      window.pushMiniModule(module, parentModule, subscriberObj);
    };
    subscriber.Events.onTalking = function(data) {
      let handle = med_ch.media_conference.subscriberHandles[data.id];
      if (handle) {
        let existingHandle;
        talkingTimeOutArray.find(handleObj => {
          if (handleObj.pluginId == handle.pluginId) {
            existingHandle = handleObj;
          }
        });
        if (existingHandle) {
          clearTimeout(existingHandle.talkingTimeOut);
          existingHandle.talkingTimeOut = setTimeout(() => {
            if (
              document.getElementById(`talking-${handle.pluginId}`) &&
              !document
                .getElementById(`talking-${handle.pluginId}`)
                .classList.contains('d-none-imp')
            ) {
              document
                .getElementById(`talking-${handle.pluginId}`)
                .classList.add('d-none-imp'); //no i18n
            }
          }, 2000);
        } else {
          let newHandle = {};
          newHandle.pluginId = handle.pluginId;
          newHandle.talkingTimeOut = setTimeout(() => {
            if (
              document.getElementById(`talking-${handle.pluginId}`) &&
              !document
                .getElementById(`talking-${handle.pluginId}`)
                .classList.contains('d-none-imp')
            ) {
              document
                .getElementById(`talking-${handle.pluginId}`)
                .classList.add('d-none-imp'); //no i18n
            }
          }, 2000);
          talkingTimeOutArray.push(newHandle);
        }
        if (document.getElementById(`talking-${handle.pluginId}`)) {
          document
            .getElementById(`talking-${handle.pluginId}`)
            .classList.remove('d-none-imp'); //no i18n
        }
      }
    };

    subscriber.Events.onStoppedTalking = function() {
      //            if(document.getElementById("talking-"+subscriber.pluginId) && !document.getElementById("talking-"+subscriber.pluginId).classList.contains("d-none-imp")){
      //                // document.getElementById("talking-"+subscriber.pluginId).classList.add("d-none-imp"); //no i18n
      //            }
    };

    subscriber.Events.onSignalingStateChange = function(object) {
      let { handle } = object;
      let { signalingState } = object;
      handleChangeInSignalingState(handle, signalingState);
    };

    subscriber.Events.onNewOffer = function(e) {
      let { handle } = e;
      let { resolve } = e;
      let { reject } = e;
      let { jsep } = e;
      let config = handle.webrtcCORE;
      // var audioStatus = handle.webrtcCORE.options.audio;
      // var videoStatus = handle.webrtcCORE.options.video;
      // var promise1 = new Promise(function(resolve1,reject1){
      //     if(audioStatus == false){
      //         handle.toggleAudio(resolve1,reject1);
      //     }else{
      //         resolve1();
      //     }
      // })
      // promise1.then(function(resolved1As){
      //     var promise2 = new Promise(function(resolve2,reject2){
      //         if(videoStatus == false){
      //             handle.toggleVideo(resolve2,reject2);
      //         }else{
      //             resolve2();
      //         }
      //     })
      //     promise2.then(function(resolved2As){
      //         media_channel.setRemoteDescription(config, jsep, handle, resolve, reject);
      //     })
      // },function(error){
      //
      // })
      media_channel.setRemoteDescription(config, jsep, handle, resolve, reject);
    };
    subscriber.Events.onStreamSubscribed = function(obj) {
      layout.layout();
      if (bandWidthSaverMode) {
        subscriber.bindVisibilty(obj.plugin);
      }
    };
    subscriber.Errors.onError = function(error) {
      let messageObj = {};
      messageObj.title = 'Oops!'; //no i18n
      if (error) {
        messageObj.content = error.error;
        openModalDialog('error', messageObj); //no i18n
      }
    };
    subscriber.Events.onVideoPlayBackFailure = function(errObj) {
      let { element } = errObj;
      let videoId = element.id;
      let pluginId = videoId.substring(videoId.indexOf('-') + 1);
      // element.controls = true;
      let videoFailDiv = document.getElementById(`callbackfail-${pluginId}`);
      if (videoFailDiv && videoFailDiv.classList.contains('d-none-imp')) {
        videoFailDiv.classList.remove('d-none-imp'); //no i18n
      }
    };

    subscriber.Events.onVideoPlayBackSuccess = function(obj) {
      layout.layout();
      if (whiteboard) {
        if (unclaimedAnnotatorData.length > 0) {
          let pointsToRemove = 0;
          let arrayOfPts = [];
          unclaimedAnnotatorData.forEach(eventParamsObj => {
            let toRemove = manageAnnotationMessage(eventParamsObj, false, true);
            if (toRemove == true) {
              arrayOfPts.push(pointsToRemove);
            }
            pointsToRemove = pointsToRemove + 1;
          });
          for (let i = arrayOfPts.length - 1; i >= 0; i--) {
            unclaimedAnnotatorData.splice(arrayOfPts[i], 1);
            layout.layout();
          }
        }
      }
    };

    subscriber.Events.onVisibilityChange = function(obj) {
      let { handle } = obj;
      let { state } = obj;
      handle.handleVisibilityChange(handle, state);
    };

    subscriber.Events.onDetachedSuccessfully = function(obj) {
      if (bandWidthSaverMode) {
        let handle = obj.plugin;
        handle.removeVisibilityBinder(handle);
      }
    };
  };

  //developer mode
  win.callBitRateChangeFunction = function(e, bitRateValue) {
    let pluginId = document.getElementById(e).dataset.pluginid;
    media_channel.allHandles.find(handle => {
      if (handle.pluginId == pluginId) {
        if (bitRateValue) {
          handle.changeBitRate(bitRateValue);
        }
      }
    });
  };

  win.substreamLayerChangeFunction = function(e, substreamValue) {
    let pluginId = document.getElementById(e).dataset.pluginid;
    media_channel.allHandles.find(handle => {
      if (handle.pluginId == pluginId) {
        handle.changeSubstreamLayer(substreamValue);
      }
    });
  };

  win.temporalLayerChangeFunction = function(e, temporalValue) {
    let pluginId = document.getElementById(e).dataset.pluginid;
    media_channel.allHandles.find(handle => {
      if (handle.pluginId == pluginId) {
        handle.changeTemporalLayer(temporalValue);
      }
    });
  };

  //common for both publishers and subscribers

  win.toggleMyStream = function(e) {
    let pluginId = document.getElementById(e).dataset.pluginid;
    media_channel.allHandles.find(publisher => {
      //possible two publishers(a/v or screenshare)
      if (publisher.pluginId == pluginId) {
        publisher.toggleStream(pluginId);
      }
    });
  };

  win.toggleMyMic = function(e) {
    let pluginId = document.getElementById(e).dataset.pluginid;
    media_channel.allHandles.find(handle => {
      //possible two publishers(a/v or screenshare)
      if (handle.pluginId == pluginId) {
        handle.toggleAudio(null, null, 'user'); //no i18n
      }
    });
  };

  win.toggleMyCam = function(e) {
    let pluginId = document.getElementById(e).dataset.pluginid;
    media_channel.allHandles.find(handle => {
      //possible two publishers(a/v or screenshare)
      //                console.log("mic toggle for pluginId--->",pluginId);
      if (handle.pluginId == pluginId) {
        handle.toggleVideo(null, null, 'user'); //no i18n
      }
    });
  };

  win.handleAudioVideoPropertyChange = function(handle, options) {
    let { pluginId } = options;
    let mic = document.getElementById(`${pluginId}-mic`);
    let cam = document.getElementById(`${pluginId}-cam`);
    if (mic && options.audio != undefined) {
      mic.removeChild(mic.childNodes[0]);
      if (
        (options.audio == true || options.audio == 'true') &&
        handle.avOptions.audio.hasAudio == true
      ) {
        //                    mic.style = "opacity:1;";
        if (options.plugin.handleType == 1) {
          mic.innerHTML =
            '<svg>\n' + '<use xlink:href="#mic-icon"></use>\n' + '</svg>'; //no i18n
        } else {
          mic.innerHTML =
            '<svg>\n' + '<use xlink:href="#speaker-icon"></use>\n' + '</svg>'; //no i18n
        }
      } else {
        if (options.plugin.handleType == 1) {
          mic.innerHTML =
            '<svg>\n' +
            '<use xlink:href="#mic-disable-icon"></use>\n' +
            '</svg>'; //no i18n
        } else {
          mic.innerHTML =
            '<svg>\n' +
            '<use xlink:href="#speaker-disable-icon"></use>\n' +
            '</svg>'; //no i18n
        }
        //                    mic.style = "opacity:.2;";
      }
    }
    if (cam && options.video != undefined) {
      cam.removeChild(cam.childNodes[0]);
      let muteDiv = document.getElementById(`${pluginId}-silo`);
      if (
        (options.video == true || options.video == 'true') &&
        handle.avOptions.video.hasVideo == true
      ) {
        //                    cam.style = "opacity:1;";
        muteDiv.classList.add('d-none'); //no i18n
        cam.innerHTML =
          '<svg>\n' + '<use xlink:href="#cam-icon"></use>\n' + '</svg>'; //no i18n
      } else {
        muteDiv.classList.remove('d-none'); //no i18n
        cam.innerHTML =
          '<svg>\n' + '<use xlink:href="#cam-disable-icon"></use>\n' + '</svg>'; //no i18n
        //                    cam.style = "opacity:.2;";
      }
    }
  };

  win.closeAlertModal = function(id) {
    document.body.removeEventListener('keydown', bindEscape);
    document.getElementById('modalDialog').classList.add('d-none-imp'); //no i18n
    document.getElementById('modalbackdrop').classList.add('d-none-imp'); //no i18n
  };

  win.openModalDialog = function(scenario, messageObj, action, actionType) {
    if (messageObj.content && messageObj.content.length > 0) {
      let modalDialog = document.getElementById('modalDialog');
      if (modalDialog && modalDialog.classList.contains('d-none-imp')) {
        let existingButton = document.getElementById('button-action');
        if (existingButton) {
          existingButton.parentNode.removeChild(existingButton);
        }
        // if(scenario == "screenshare" || scenario == "annotate" || scenario =="publish" || scenario =="subscribe"){
        document.getElementById('modal-title').innerHTML = '';
        document.getElementById('modal-title').innerHTML += textify(
          messageObj.title
        );
        document.getElementById('modal-body').innerHTML = '';
        document.getElementById('modal-body').innerHTML += textify(
          messageObj.content
        );
        if (messageObj.resolveBy && messageObj.resolveMsg) {
          let pluginId;
          if (messageObj.handleObj) {
            pluginId = messageObj.handleObj.pluginId;
            document.getElementById(
              'modal-body'
            ).innerHTML += `<a id=${pluginId}-republish style='color:#23527c' data-pluginId=${pluginId} onclick=${
              messageObj.resolveBy
            }> ${textify(messageObj.resolveMsg)}</a>`;
          } else {
            document.getElementById(
              'modal-body'
            ).innerHTML += `<a style='color:#23527c' onclick=${
              messageObj.resolveBy
            }> ${textify(messageObj.resolveMsg)}</a>`;
          }
        }
        // }else if(scenario == "exit"){
        //     document.getElementById('modal-title').innerHTML += "Exit";
        //     document.getElementById('modal-body').innerHTML += "Are you sure you want to exit this session?";
        // }
        if (action) {
          let button = document.createElement('button');
          button.type = 'button';
          button.id = 'button-action';
          if (actionType == 1) {
            button.classList.add('btn'); //no i18n
            button.classList.add('btn-sm'); //no i18n
            button.classList.add('btn-primary'); //no i18n
          } else {
            button.classList.add('btn'); //no i18n
            button.classList.add('btn-sm'); //no i18n
            button.classList.add('btn-danger'); //no i18n
          }
          button.setAttribute('onClick', 'modalAction()');
          button.innerHTML += textify(action);
          let modalFooter = document.getElementById('modal-footer');
          if (modalFooter) {
            button.setAttribute('data-action', scenario);
            modalFooter.append(button);
          }
        }
        document.body.addEventListener('keydown', bindEscape);
        modalDialog.classList.remove('d-none-imp'); //no i18n
        document.getElementById('modalbackdrop').classList.remove('d-none-imp'); //no i18n
      }
    }
  };

  win.modalAction = function() {
    let clickedButton = document.getElementById('button-action');
    let { action } = clickedButton.dataset;
    if (action == 'exit') {
      exit(true);
    }
  };

  win.stopTracks = function(elementId) {
    try {
      let element = document.getElementById(elementId);
      if (element) {
        let stream = element.srcObject;
        if (stream) {
          stream.getTracks().forEach(track => {
            track.stop();
          });
          element.srcObject = null;
        }
      }
    } catch (e) {
      // console.log("while stopping track",e);
    }
  };
}(window));
