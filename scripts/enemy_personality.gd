## Personalidade do oponente: sorteada uma vez no início da partida (ver
## DuelScene._ready() e EnemyAiController). Define o viés de construção do
## baralho (build_deck — com aleatoriedade, não uma lista fixa) e boa parte
## do estilo de jogo através de traços simples (attack_share, bloqueio
## arriscado, chance de invocação grátis). Os comportamentos mais
## específicos — Vingativo, Oportunista, Espelho, Desesperado, Diplomata,
## Predador, Colecionador, Tartaruga — são resolvidos com o estado atual da
## partida diretamente em EnemyAiController/TurnManager/CombatManager,
## consultando esta classe só pelos parâmetros base.
class_name EnemyPersonality
extends RefCounted

enum Type {
	CAOTICO,
	AGRESSIVO,
	DEFENSIVO,
	PACIENTE,
	PARANOICO,
	VINGATIVO,
	AMBICIOSO,
	TRAPACEIRO,
	OPORTUNISTA,
	DIPLOMATA,
	PREDADOR,
	COLECIONADOR,
	ESPELHO,
	DESESPERADO,
	TARTARUGA,
}

const DISPLAY_NAMES: Dictionary = {
	Type.CAOTICO: "Caótico",
	Type.AGRESSIVO: "Agressivo",
	Type.DEFENSIVO: "Defensivo",
	Type.PACIENTE: "Paciente",
	Type.PARANOICO: "Paranoico",
	Type.VINGATIVO: "Vingativo",
	Type.AMBICIOSO: "Ambicioso",
	Type.TRAPACEIRO: "Trapaceiro",
	Type.OPORTUNISTA: "Oportunista",
	Type.DIPLOMATA: "Diplomata",
	Type.PREDADOR: "Predador",
	Type.COLECIONADOR: "Colecionador",
	Type.ESPELHO: "Espelho",
	Type.DESESPERADO: "Desesperado",
	Type.TARTARUGA: "Tartaruga",
}

## Fração-base (0..1) dos atacantes elegíveis que realmente atacam a cada
## turno (ver EnemyAiController._compute_attack_share, que sobrescreve
## esse valor pras personalidades reativas: Caótico, Espelho, Desesperado,
## Vingativo).
const BASE_ATTACK_SHARE: Dictionary = {
	Type.AGRESSIVO: 1.0,
	Type.DEFENSIVO: 0.4,
	Type.PACIENTE: 0.35,
	Type.TARTARUGA: 0.25,
	Type.COLECIONADOR: 0.3,
}
const DEFAULT_ATTACK_SHARE: float = 0.85

## Personalidades que tentam bloquear mesmo sem uma troca segura
## (DEF+Escudo >= ATK do atacante) — preferem sofrer perdas a levar dano
## direto no castelo.
const ALWAYS_TRY_BLOCK: Array[Type] = [Type.PARANOICO, Type.DEFENSIVO, Type.TARTARUGA]

## Chance (0..1) de invocar 1 carta por turno ignorando o custo em
## Sangue — a "brecha" do Trapaceiro.
const FREE_SUMMON_CHANCE: Dictionary = {
	Type.TRAPACEIRO: 0.6,
}

## Diferença de vida (jogador - oponente) a partir da qual o Diplomata
## desiste da luta (ver TurnManager._on_enemy_invocation_entered).
const DIPLOMATA_SURRENDER_MARGIN: int = 10

var type: Type


func _init(personality_type: Type) -> void:
	type = personality_type


static func roll_random() -> EnemyPersonality:
	return EnemyPersonality.new(Type.values()[randi() % Type.size()])


func display_name() -> String:
	return DISPLAY_NAMES.get(type, "?")


func base_attack_share() -> float:
	return BASE_ATTACK_SHARE.get(type, DEFAULT_ATTACK_SHARE)


func always_tries_to_block() -> bool:
	return type in ALWAYS_TRY_BLOCK


func free_summon_chance() -> float:
	return FREE_SUMMON_CHANCE.get(type, 0.0)


## Peso relativo de `card` na montagem do baralho desta personalidade —
## usado por build_deck() numa amostragem ponderada: cartas de peso maior
## são mais prováveis de aparecer (repetidas vezes, inclusive), não
## garantidas — o mesmo tipo de personalidade gera baralhos um pouco
## diferentes a cada partida.
func _card_weight(card: CardResource) -> float:
	match type:
		Type.AGRESSIVO, Type.DESESPERADO:
			return 1.0 + card.attack * 1.5
		Type.DEFENSIVO, Type.TARTARUGA:
			return 1.0 + float(card.defense + card.shield + card.horde) * 1.5
		Type.PACIENTE, Type.AMBICIOSO:
			return 1.0 + maxf(0.0, 4.0 - card.blood_cost) * 1.2
		Type.TRAPACEIRO:
			return 3.0 if card.blood_cost <= 1 else 1.0
		Type.PREDADOR:
			return 1.0 + card.attack + card.defense
		Type.COLECIONADOR, Type.CAOTICO:
			return 1.0  # uniforme — quer variedade/loteria, não força bruta
		_:
			return 1.0 + float(card.attack + card.defense) * 0.5


## Monta um baralho de `deck_size` cartas a partir de `pool`, amostrando
## com reposição e peso conforme a personalidade.
func build_deck(pool: Array[CardResource], deck_size: int) -> Array[CardResource]:
	var deck: Array[CardResource] = []
	if pool.is_empty() or deck_size <= 0:
		return deck

	var weights: Array[float] = []
	var total_weight := 0.0
	for card in pool:
		var w: float = maxf(_card_weight(card), 0.01)
		weights.append(w)
		total_weight += w

	for i in range(deck_size):
		var roll := randf() * total_weight
		var acc := 0.0
		for j in range(pool.size()):
			acc += weights[j]
			if roll <= acc:
				deck.append(pool[j])
				break

	return deck
