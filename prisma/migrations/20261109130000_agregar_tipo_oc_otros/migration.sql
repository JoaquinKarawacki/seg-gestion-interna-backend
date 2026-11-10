-- Agrega el valor OTROS al enum de tipo de orden (TipoOC / tipo_oc).
ALTER TYPE "tipo_oc" ADD VALUE IF NOT EXISTS 'OTROS';
