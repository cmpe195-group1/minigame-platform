package cmpe195.group1.minigameplatform.games.knockout.model;

import cmpe195.group1.minigameplatform.games.knockout.payload.ResolveTurnPayload;
import cmpe195.group1.minigameplatform.games.knockout.payload.ShotPayload;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class KnockoutModelTest {

    @Test
    void knockoutGameState_startsWithExpectedDefaultsAndSupportsMutation() {
        KnockoutGameState gameState = new KnockoutGameState();

        assertThat(gameState.getCurrentPlayer()).isNull();
        assertThat(gameState.getPhase()).isNull();
        assertThat(gameState.getWinner()).isNull();
        assertThat(gameState.getTurnNumber()).isZero();
        assertThat(gameState.getPucks()).isEmpty();

        PuckState puck = new PuckState("A-1", "A", 170.0, 140.0, true);
        gameState.setCurrentPlayer("A");
        gameState.setPhase("aiming");
        gameState.setWinner("B");
        gameState.setTurnNumber(4);
        gameState.setPucks(List.of(puck));

        assertThat(gameState.getCurrentPlayer()).isEqualTo("A");
        assertThat(gameState.getPhase()).isEqualTo("aiming");
        assertThat(gameState.getWinner()).isEqualTo("B");
        assertThat(gameState.getTurnNumber()).isEqualTo(4);
        assertThat(gameState.getPucks()).containsExactly(puck);
    }

    @Test
    void roomState_startsWithExpectedDefaults() {
        RoomState room = new RoomState();

        assertThat(room.getRoomCode()).isNull();
        assertThat(room.getHostClientId()).isNull();
        assertThat(room.getMaxPlayers()).isEqualTo(2);
        assertThat(room.getParticipants()).isEmpty();
        assertThat(room.getStatus()).isNull();
        assertThat(room.getGameState()).isNull();
        assertThat(room.getLastShot()).isNull();
    }

    @Test
    void valueObjectsAndPayloads_roundTripConstructorsAndAccessors() {
        PuckState puck = new PuckState("A-1", "A", 10.5, 20.5, true);
        assertThat(puck.getId()).isEqualTo("A-1");
        assertThat(puck.getPlayer()).isEqualTo("A");
        assertThat(puck.getX()).isEqualTo(10.5);
        assertThat(puck.getY()).isEqualTo(20.5);
        assertThat(puck.isActive()).isTrue();

        PuckState mutablePuck = new PuckState();
        mutablePuck.setId("B-2");
        mutablePuck.setPlayer("B");
        mutablePuck.setX(30.5);
        mutablePuck.setY(40.5);
        mutablePuck.setActive(false);
        assertThat(mutablePuck.getId()).isEqualTo("B-2");
        assertThat(mutablePuck.getPlayer()).isEqualTo("B");
        assertThat(mutablePuck.getX()).isEqualTo(30.5);
        assertThat(mutablePuck.getY()).isEqualTo(40.5);
        assertThat(mutablePuck.isActive()).isFalse();

        LastShot shot = new LastShot("A-1", 2, 1.25, -0.75, "client-a");
        assertThat(shot.getPuckId()).isEqualTo("A-1");
        assertThat(shot.getTurnNumber()).isEqualTo(2);
        assertThat(shot.getImpulseX()).isEqualTo(1.25);
        assertThat(shot.getImpulseY()).isEqualTo(-0.75);
        assertThat(shot.getShooterClientId()).isEqualTo("client-a");

        LastShot mutableShot = new LastShot();
        mutableShot.setPuckId("B-1");
        mutableShot.setTurnNumber(3);
        mutableShot.setImpulseX(-2.0);
        mutableShot.setImpulseY(5.0);
        mutableShot.setShooterClientId("client-b");
        assertThat(mutableShot.getPuckId()).isEqualTo("B-1");
        assertThat(mutableShot.getTurnNumber()).isEqualTo(3);
        assertThat(mutableShot.getImpulseX()).isEqualTo(-2.0);
        assertThat(mutableShot.getImpulseY()).isEqualTo(5.0);
        assertThat(mutableShot.getShooterClientId()).isEqualTo("client-b");

        RoomParticipant participant = new RoomParticipant(1, "Host", "host-client", "A");
        assertThat(participant.getPlayerId()).isEqualTo(1);
        assertThat(participant.getName()).isEqualTo("Host");
        assertThat(participant.getClientId()).isEqualTo("host-client");
        assertThat(participant.getSide()).isEqualTo("A");

        RoomParticipant mutableParticipant = new RoomParticipant();
        mutableParticipant.setPlayerId(2);
        mutableParticipant.setName("Guest");
        mutableParticipant.setClientId("guest-client");
        mutableParticipant.setSide("B");
        assertThat(mutableParticipant.getPlayerId()).isEqualTo(2);
        assertThat(mutableParticipant.getName()).isEqualTo("Guest");
        assertThat(mutableParticipant.getClientId()).isEqualTo("guest-client");
        assertThat(mutableParticipant.getSide()).isEqualTo("B");

        ShotPayload shotPayload = new ShotPayload();
        shotPayload.setRoomCode("room-1");
        shotPayload.setTurnNumber(5);
        shotPayload.setPuckId("A-3");
        shotPayload.setImpulseX(9.5);
        shotPayload.setImpulseY(-3.5);
        assertThat(shotPayload.getRoomCode()).isEqualTo("room-1");
        assertThat(shotPayload.getTurnNumber()).isEqualTo(5);
        assertThat(shotPayload.getPuckId()).isEqualTo("A-3");
        assertThat(shotPayload.getImpulseX()).isEqualTo(9.5);
        assertThat(shotPayload.getImpulseY()).isEqualTo(-3.5);

        ResolveTurnPayload resolveTurnPayload = new ResolveTurnPayload();
        resolveTurnPayload.setRoomCode("room-2");
        resolveTurnPayload.setResultingState(new KnockoutGameState());
        assertThat(resolveTurnPayload.getRoomCode()).isEqualTo("room-2");
        assertThat(resolveTurnPayload.getResultingState()).isNotNull();
    }
}

