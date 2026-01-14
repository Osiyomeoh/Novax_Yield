import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AnalyticsDocument = Analytics & Document;

@Schema({ timestamps: true })
export class Analytics {
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  type: string;

  @Prop({ type: Object, required: true })
  data: any;

  @Prop()
  assetId?: string;

  @Prop()
  userId?: string;
}

export const AnalyticsSchema = SchemaFactory.createForClass(Analytics);
