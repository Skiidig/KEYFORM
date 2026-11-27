export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];

export interface MotionKeyframe {
  t: number;
  source_frame: number;
  offset_gltf_m: Vec3;
}

export interface ChildMotionOverride {
  node: string;
  parent_node: string;
  interpolation: string;
  motion_keyframes: MotionKeyframe[];
  note: string;
}

export interface AssemblyGroupSpec {
  id: string;
  index: number;
  label: string;
  asset_partition: 'exterior' | 'internal';
  parent_node: 'KF01_TiltPivot_6p5deg' | 'KF01_Root';
  coordinate_frame: string;
  assembled_offset_gltf_m: Vec3;
  exploded_offset_gltf_m: Vec3;
  interpolation: 'LINEAR' | 'PIECEWISE_LINEAR' | 'STATIC';
  motion_keyframes: MotionKeyframe[];
  child_motion_overrides?: ChildMotionOverride[];
  clearance_validation: string;
  contents: string;
}

export interface KeySpec {
  id: string;
  row: string;
  profile: 'R1' | 'R2' | 'R3' | 'R4';
  is_convex_space?: boolean;
  width_u: number;
  width_m: number;
  depth_m: number;
  labels: string[];
  display_label: string;
  dom_code: string;
  semantic_finish_role: 'alpha' | 'modifier' | 'accent_optional';
  default_material_slot: string;
  stabilizer_span_m: number | null;
  alt_a_offset_m: [number, number];
  assembled_transform_gltf: {
    parent_group: string;
    local_translation_m: Vec3;
    world_translation_m: Vec3;
    rotation_quat_xyzw: Quat;
  };
  press: {
    coordinate_frame: string;
    axis_local_gltf: Vec3;
    travel_min_m: number;
    travel_max_m: number;
    pretravel_nominal_m: number;
    spring_compression_divisor_m: number;
    driven_nodes: {
      cap: string;
      switch_stem: string;
      switch_spring: string;
      stabilizer_sliders: string[];
    };
  };
  geometry_refs: {
    cap_node: string;
    cap_mesh: string;
    mount_node: string;
    mount_mesh: string;
    /** B2.1+: glyph geometry is stripped from the exported caps and served by the atlas. */
    legend_nodes: string[];
    switch_root_node: string;
    switch_part_nodes: string[];
    socket_node: string;
    /** B2.1+: 'cap_mask' for the 80 labelled keys, 'blank' for Space. */
    legend_rendering?: 'cap_mask' | 'blank';
  };
  material_slots: {
    cap_shell: string;
    cap_mount: string;
    legends: string[];
  };
}

export interface GlbAssetSpec {
  filename: string;
  relative_path: string;
  bytes: number;
  sha256: string;
  /** B2.1+: 'EXT_meshopt_compression' marks a payload that needs the Meshopt decoder. */
  requires?: string;
  groups: string[];
  node_count: number;
  mesh_count: number;
  primitive_count: number;
  triangle_count: number;
  material_names: string[];
  bounds_gltf_m: {
    min: Vec3;
    max: Vec3;
    size: Vec3;
  };
  dependencies: string[];
}

export type AssetPartitionKey = 'exterior' | 'internal' | 'hero_switch';
export type AssetVariantPartitionKey = AssetPartitionKey | 'encoder_macro';
export type AssetVariantTier = 'meshopt' | 'uncompressed';

export interface AssetVariantSpec {
  filename: string;
  relative_path: string;
  bytes: number;
  sha256: string;
  requires?: string;
}

export interface LegendTierSpec {
  tier: 'mobile' | 'desktop';
  resolution: 1024 | 2048;
  file: string;
  bytes: number;
  sha256: string;
  mapping: string;
  mapping_sha256: string;
  mapping_bytes: number;
}

export interface LegendAtlasSpec {
  schema: string;
  canonical_keys: number;
  labeled_keys: number;
  blank_keys: string[];
  original_glyph_sources: number;
  tiers: LegendTierSpec[];
}

export interface ProductionCandidatesSpec {
  encoder?: {
    macro_asset_key?: string;
    macro_triangles?: number;
    standard_triangles?: number;
    normal_material_id?: string;
    material_family?: string;
    embedded_normal_map?: {
      resolution: number;
      storage: 'embedded';
      asset_key: 'exterior';
      image: string;
      bytes: number;
      sha256: string;
    };
  };
  [key: string]: unknown;
}

export type EnclosurePresetId = 'forest' | 'obsidian' | 'carbon' | 'titanium';
export type HeroSwitchVariantId = 'linear45' | 'tactile58' | 'silent50';

export interface EnclosurePresetSpec {
  label: string;
  source_material: string;
  base_color_srgb_hex: string;
  base_color_linear: [number, number, number, number];
  source_ramp_srgb: string[];
  metallic: number;
  roughness: number;
  clearcoat: number;
  clearcoat_roughness: number;
  mark_color_srgb_hex: string;
  is_default: boolean;
}

export interface MaterialSlotSpec {
  base_color_linear: [number, number, number, number];
  base_color_srgb_hex: string;
  source_color_ramp_srgb: string[];
  metallic: number;
  roughness: number;
  ior: number;
  specular_ior_level: number;
  transmission: number;
  clearcoat_weight: number;
  clearcoat_roughness: number;
}

export interface AssetManifest {
  schema_version: string;
  asset_version: string;
  generated_at: string;
  product: {
    id: string;
    display_name: string;
    category: string;
    layout_name: string;
    layout_revision: string;
    layout_study_source: string;
    key_count: number;
    encoder_count: number;
    assembly_group_count: number;
    pitch_m: number;
    keycap_gap_m: number;
    footprint_m: [number, number];
    keybed_footprint_m: [number, number];
    typing_angle_deg: number;
    relocated_switch_ids: string[];
  };
  units_and_coordinates: {
    units: string;
    runtime_up_axis: string;
    blender_to_gltf_position_rule: string;
    runtime_root_scale: Vec3;
    desk_plane_y_m: number;
    root_node: string;
    tilt_pivot_node: string;
    tilt_pivot_transform_gltf: {
      translation_m: Vec3;
      rotation_quat_xyzw: Quat;
      rotation_euler_deg_xyz: Vec3;
      scale: Vec3;
    };
  };
  assets: {
    exterior: GlbAssetSpec;
    internal: GlbAssetSpec;
    hero_switch: GlbAssetSpec;
  };
  assembly_groups: AssemblyGroupSpec[];
  keys: KeySpec[];
  encoder: {
    id: string;
    knob_node: string;
    knob_mesh: string;
    knob_mark_node: string;
    input_node: string;
    shaft_node: string;
    knob_diameter_m: number;
    knob_height_m: number;
    assembled_transform_gltf: {
      keybed_local_translation_m: Vec3;
      world_translation_m: Vec3;
      rotation_quat_xyzw: Quat;
    };
    rotation: {
      axis_local_gltf: Vec3;
      detents_per_revolution: number;
      step_deg: number;
      step_rad: number;
      continuous: boolean;
    };
    push: {
      axis_local_gltf: Vec3;
      travel_min_m: number;
      travel_max_m: number;
    };
    material_slots: {
      knurl_barrel: string;
      top_face: string;
      reference_mark: string;
    };
  };
  hero_switch: {
    root_node: string;
    asset_key: string;
    pose_note: string;
    distinct_from_installed_switches: boolean;
    parts: Array<{ node: string; mesh: string; subgroup: string; local_translation_gltf_m: Vec3 }>;
    variants: Record<
      HeroSwitchVariantId,
      {
        label: string;
        lid_material: string;
        stem_material: string;
        lid_pbr: MaterialSlotSpec;
        stem_pbr: MaterialSlotSpec;
      }
    >;
  };
  materials: {
    default_colorway_policy: string;
    charcoal_pbt_resolution: {
      definitive_base_color_srgb_hex: string;
      definitive_base_color_linear: [number, number, number, number];
      cycles_procedural_ramp_srgb: string[];
      alpha_and_mod_identical: boolean;
      esc_uses_charcoal_mod: boolean;
      explanation: string;
    };
    enclosure_presets: Record<EnclosurePresetId, EnclosurePresetSpec>;
    slots: Record<string, MaterialSlotSpec>;
  };
  // ---- KF-003C-B2.1 production candidate additions -------------------------
  /** Physical partition specs (3 entries). `encoder_macro` lives only in `asset_variants`. */
  asset_variants?: Partial<Record<AssetVariantPartitionKey, Partial<Record<AssetVariantTier, AssetVariantSpec>>>>;
  /** Cap-surface legend atlas: versioned PNG + mapping pair per tier. */
  legend_atlas?: LegendAtlasSpec;
  production_candidates?: ProductionCandidatesSpec;
  runtime_integration?: {
    milestone?: string;
    derived_from_asset_version?: string;
    runtime_baseline?: string;
    source_manifest_sha256?: string;
    url_resolution?: 'manifest-relative';
    fallback?: 'static-photography';
    optional_asset_keys?: AssetVariantPartitionKey[];
    decoder?: Record<string, unknown>;
    legend_adapter?: string;
    macro_asset_key?: string;
  };
}
