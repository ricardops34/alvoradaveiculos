import { Injectable } from '@angular/core';
import { PoLookupFilter, PoLookupFilteredItemsParams } from '@po-ui/ng-components';
import { Observable, from } from 'rxjs';
import { DatabaseService } from './database';

export class GenericLookupService implements PoLookupFilter {
  constructor(protected db: DatabaseService, protected table: string, protected searchField: string = 'nome') {}

  getFilteredItems(filteredParams: PoLookupFilteredItemsParams): Observable<any> {
    return from(this.db.getAll(this.table).then(all => {
      const filter = filteredParams.filter ? filteredParams.filter.toLowerCase() : '';
      const filtered = all.filter((item: any) => {
         const val = item[this.searchField] || '';
         return val.toString().toLowerCase().includes(filter);
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
