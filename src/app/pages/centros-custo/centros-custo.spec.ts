import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CentrosCusto } from './centros-custo';

describe('CentrosCusto', () => {
  let component: CentrosCusto;
  let fixture: ComponentFixture<CentrosCusto>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CentrosCusto],
    }).compileComponents();

    fixture = TestBed.createComponent(CentrosCusto);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
