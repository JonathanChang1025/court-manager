import { useState, useEffect } from "react";
import LoginForm from "./LoginForm";
import Profile from "./Profile";
import { RESOURCES } from "../../resource";
import firebase from "../../services/firebase";
import { v4 as uuidv4 } from "uuid";

function CheckIn() {
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionUUID, setSessionUUID] = useState("");
  const [playerData, setPlayerData] = useState(null);
  
  useEffect(() => {
		setSessionsListener(setSessionActive, setSessionUUID);
	}, []);

  const Login = (playerType, userDetails) => {
    if (userDetails != null) {
      instantiatePlayerData(setPlayerData, userDetails, sessionUUID);
    } else {
      console.log("userDetails is null: Memeber does not exist in member table database");
    }
  }

  const createPlayerButton = () => {
  const playerRef = firebase.database().ref('Players')

  playerRef.once('value', (snapshot) => {
    createPlayer(
      {
        uuid: uuidv4(),
        name: "Test Name",
        phone: "1010101010"
      },
      sessionUUID,
      snapshot.numChildren()
    );
  });
    
  }

  const logout = () => {
    playerData.active = false;
    updatePlayerData(playerData);
    setPlayerData(null);
    stopPlayerListener(playerData);
  }

  const console = () => {
    const playerRef = firebase.database().ref('Players')

    playerRef.orderByChild("position").once("value", (snapshot) => {
      snapshot.forEach(function(player) {
        console.log(player.key);
      });
    });
  }

  return (
    <div className="CheckIn">
      {sessionActive ?
        <>
          {playerData != null ?
            <Profile
              playerData={playerData}
              logout={logout}
              console={console}
              createPlayerButton={createPlayerButton}
            /> :
            <LoginForm Login={Login}/>
          }
        </> :
        <div className="m-4 p-5 bg-secondary text-white rounded">
          <div className="container">
            <h1 className="display-4">{RESOURCES.CHECKIN.INACTIVE.TITLE}</h1>
            <p className="lead">{RESOURCES.CHECKIN.INACTIVE.MESSAGE}</p>
          </div>
        </div>
      }
    </div>
  );
}

function setSessionsListener(setSessionActive, setSessionUUID) {
  const sessionRef = firebase.database().ref('Sessions')

  sessionRef.on('value', (snapshot) => {
    const sessions = snapshot.val();
    const sessionList = [];
    for (let uuid in sessions) {
      sessionList.push({uuid, ...sessions[uuid]});
      setSessionUUID(uuid); // In the future we'll have more sessions not just one
    }

    if (!sessionList.length) {
      setSessionActive(false);
    } else {
      setSessionActive(true);
    }
  });
}

function startPlayerListener(setPlayerData, playerData) {
  const playerRef = firebase.database().ref('Players').child(playerData.uuid)

  playerRef.on('value', (snapshot) => {
    const player = snapshot.val();
    if (!player.active) {
      setPlayerData(null);
      stopPlayerListener(playerData);
    } else {
      var fullPlayerData = {uuid: playerData.uuid, ...player};
      setPlayerData(fullPlayerData);
    }
  });
}

function stopPlayerListener(playerData) {
  const playerRef = firebase.database().ref('Players').child(playerData.uuid)
  playerRef.off('value');
}

function instantiatePlayerData(setPlayerData, userFullDetails, sessionUUID) {
  const playerRef = firebase.database().ref('Players')

  playerRef.once('value', (snapshot) => {
    const players = snapshot.val();
    var fullPlayerData = null;

    for (let uuid in players) {
      if (userFullDetails.uuid === players[uuid].user_uuid) {
        fullPlayerData = {uuid: uuid, ...players[uuid]};
        fullPlayerData.active = true;
        updatePlayerData(fullPlayerData);
        setPlayerData(fullPlayerData);
        startPlayerListener(setPlayerData, fullPlayerData);
        break;
      }
    }

    // First time logging in
    if (fullPlayerData == null) {
      createPlayer(userFullDetails, sessionUUID, snapshot.numChildren());

      // Still need to fetch again from firebase because we want to get the generated player UUID
      playerRef.once('value', (snapshot) => {
        const players = snapshot.val();
   
        for (let uuid in players) {
          if (userFullDetails.uuid === players[uuid].user_uuid) {
            fullPlayerData = {uuid: uuid, ...players[uuid]};
            setPlayerData(fullPlayerData);
            startPlayerListener(setPlayerData, fullPlayerData);
            break;
          }
        }
      });
    }
  });
}

function createPlayer(playerFullDetails, sessionUUID, playerCount) {
  const playerRef = firebase.database().ref('Players')
  const {uuid, ...playerDetails} = playerFullDetails;

  console.log(playerCount);
  playerRef.push({
    user_uuid : uuid,
    created_at : Date(),
    active : true,
    session_uuid : sessionUUID,
    total_games : 0,
    current_court : -1,
    next_court : -1,
    position : playerCount,
    ...playerDetails
  });
}

function updatePlayerData(playerFullData) {
  const playerRef = firebase.database().ref('Players');
  const {uuid, ...playerData} = playerFullData;
  playerRef.child(uuid).set(playerData);
}

export default CheckIn;