shader_type spatial;

uniform sampler2D viewport_texture : source_color, filter_linear_mipmap;
uniform vec4 body_color : source_color = vec4(0.15, 0.15, 0.15, 1.0);

// Seleção da Face no Inspetor
uniform int target_face : hint_enum("Frente (+Z)", "Trás (-Z)", "Topo (+Y)", "Base (-Y)", "Direita (+X)", "Esquerda (-X)") = 0;

// Tamanho do BoxMesh (ajuste no Inspetor se mudar a propriedade Size da caixa)
uniform vec3 box_size = vec3(1.0, 1.0, 1.0);

varying vec3 local_normal;
varying vec3 local_pos;

void vertex() {
	local_normal = NORMAL;
	local_pos = VERTEX; // Captura a posição 3D local de cada vértice
}

void fragment() {
	bool is_target_face = false;
	vec2 face_uv = vec2(0.0);

	// Normaliza a posição local para o intervalo de -0.5 a 0.5 com base no tamanho do cubo
	vec3 norm_pos = local_pos / box_size;

	switch (target_face) {
		case 0: // Frente (+Z)
			is_target_face = local_normal.z > 0.9;
			face_uv = vec2(norm_pos.x + 0.5, -norm_pos.y + 0.5);
			break;
		case 1: // Trás (-Z)
			is_target_face = local_normal.z < -0.9;
			face_uv = vec2(-norm_pos.x + 0.5, -norm_pos.y + 0.5);
			break;
		case 2: // Topo (+Y)
			is_target_face = local_normal.y > 0.9;
			face_uv = vec2(norm_pos.x + 0.5, norm_pos.z + 0.5);
			break;
		case 3: // Base (-Y)
			is_target_face = local_normal.y < -0.9;
			face_uv = vec2(norm_pos.x + 0.5, -norm_pos.z + 0.5);
			break;
		case 4: // Direita (+X)
			is_target_face = local_normal.x > 0.9;
			face_uv = vec2(-norm_pos.z + 0.5, -norm_pos.y + 0.5);
			break;
		case 5: // Esquerda (-X)
			is_target_face = local_normal.x < -0.9;
			face_uv = vec2(norm_pos.z + 0.5, -norm_pos.y + 0.5);
			break;
	}

	if (is_target_face) {
		// Amostra a textura usando o UV recalculado especificamente para essa face
		ALBEDO = texture(viewport_texture, face_uv).rgb;
	} else {
		ALBEDO = body_color.rgb;
	}
}