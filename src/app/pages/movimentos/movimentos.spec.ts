import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Movimentos } from './movimentos';

describe('Movimentos', () => {
  let component: Movimentos;
  let fixture: ComponentFixture<Movimentos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Movimentos],
    }).compileComponents();

    fixture = TestBed.createComponent(Movimentos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
