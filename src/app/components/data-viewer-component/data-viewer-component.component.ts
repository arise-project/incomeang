import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-data-viewer',
  imports: [CommonModule],
  templateUrl: './data-viewer-component.component.html',
  styleUrl: './data-viewer-component.component.scss'
})
export class DataViewerComponentComponent {
  @Input() fileData: { fileName: string; headers: string[]; rows: any[]}[] = [];
  @Input() headerofsection: string = '';
  @Output() groupData = new EventEmitter<void>();

  getObjectValues(obj: any): any[] {
    return Object.values(obj);
  }

  onGroupData(){
    this.groupData.emit();
  }

}
