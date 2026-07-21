import { Injectable } from '@angular/core';
import { PoLookupFilter, PoLookupFilteredItemsParams } from '@po-ui/ng-components';
import { Observable, from } from 'rxjs';
import { DatabaseService } from './database';

export class GenericLookupService implements PoLookupFilter {
  constructor(protected db: DatabaseService, protected table: string, protected searchField: string = 'nome') {}

  getFilteredItems(filteredParams: PoLookupFilteredItemsParams): Observable<any> {
    return from(this.db.getAll(this.table, { limit: 1000000 }).then(response => {
      const all = response?.items || response || [];
      const filter = filteredParams.filter ? filteredParams.filter.toLowerCase() : '';
      const params = filteredParams.filterParams || {};

      const filtered = all.filter((item: any) => {
         // Filtro por texto
         const val = item[this.searchField] || '';
         const matchesSearch = val.toString().toLowerCase().includes(filter);
         
         // Filtro por parâmetros extras (ex: is_fornecedor: true)
         let matchesParams = true;
         Object.keys(params).forEach(key => {
           if (item[key] !== params[key]) matchesParams = false;
         });

         return matchesSearch && matchesParams;
      });
      return {
        items: filtered.map((i: any) => ({ ...i, value: i.id, label: i[this.searchField] })),
        hasNext: false
      };
    }));
  }

  getObjectByValue(value: string | any[]): Observable<any> {
    // Para simplificar, assumimos que value é sempre a chave primária
    // Se for array (multi), deveríamos buscar múltiplos, mas o padrão aqui é simples.
    const id = Array.isArray(value) ? value[0] : value;
    return from(this.db.getById(this.table, id).then((item: any) => {
      if (!item) return null;
      return { ...item, value: item.id, label: item[this.searchField] };
    }));
  }
}

@Injectable({ providedIn: 'root' })
export class PessoasLookupService extends GenericLookupService {
  constructor(db: DatabaseService) { super(db, 'pessoas', 'nome'); }
}

@Injectable({ providedIn: 'root' })
export class BancosLookupService extends GenericLookupService {
  constructor(db: DatabaseService) { super(db, 'bancos', 'nome'); }
}

@Injectable({ providedIn: 'root' })
export class CentrosCustoLookupService extends GenericLookupService {
  constructor(db: DatabaseService) { super(db, 'centros_custo', 'nome'); }
}

@Injectable({ providedIn: 'root' })
export class PerfisLookupService extends GenericLookupService {
  constructor(db: DatabaseService) { super(db, 'perfis', 'nome'); }
}

@Injectable({ providedIn: 'root' })
export class VeiculosLookupService extends GenericLookupService {
  constructor(db: DatabaseService) { super(db, 'veiculos', 'placa'); }
}

// Município é sub-recurso de Localização (não tem entrada no mapa de endpoints do
// DatabaseService) e precisa de busca server-side (~5.500 registros no Brasil todo),
// filtrada pela UF escolhida no formulário — por isso não usa o GenericLookupService.
@Injectable({ providedIn: 'root' })
export class MunicipiosLookupService implements PoLookupFilter {
  constructor(private db: DatabaseService) {}

  getFilteredItems(filteredParams: PoLookupFilteredItemsParams): Observable<any> {
    const extraParams = filteredParams.filterParams || {};
    return from(this.db.http.get<any>('/api/localizacao/municipios', {
      params: {
        filter: filteredParams.filter || '',
        estado_id: extraParams.estado_id || '',
        limit: 50
      }
    }).toPromise().then((response: any) => {
      const items = (response?.items || []).map((m: any) => ({ ...m, value: m.id, label: `${m.nome} - ${m.estado_sigla}` }));
      return { items, hasNext: false };
    }));
  }

  getObjectByValue(value: string | any[]): Observable<any> {
    const id = Array.isArray(value) ? value[0] : value;
    return from(this.db.http.get<any>(`/api/localizacao/municipios/${id}`).toPromise().then((m: any) => {
      if (!m) return null;
      return { ...m, value: m.id, label: `${m.nome} - ${m.estado_sigla}` };
    }).catch(() => null));
  }
}
