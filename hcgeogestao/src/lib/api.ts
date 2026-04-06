/**
 * Centralização da Configuração da API - HC GeoGestão
 * Este arquivo centraliza o endereço do backend para facilitar a transição
 * entre ambientes de Desenvolvimento (localhost) e Produção (VPS).
 */

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4545";

// Exemplo opcional: Se no futuro usarmos axios centralizado:
/*
import axios from 'axios';
export const api = axios.create({
  baseURL: API_URL,
});
*/
