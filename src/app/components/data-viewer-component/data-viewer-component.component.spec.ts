import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataViewerComponentComponent } from './data-viewer-component.component';

describe('DataViewerComponentComponent', () => {
  let component: DataViewerComponentComponent;
  let fixture: ComponentFixture<DataViewerComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataViewerComponentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataViewerComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
