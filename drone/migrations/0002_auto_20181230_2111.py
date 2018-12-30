# Generated by Django 2.1 on 2018-12-30 12:11

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('drone', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='rover',
            name='latitude',
            field=models.DecimalField(decimal_places=8, max_digits=11),
        ),
        migrations.AlterField(
            model_name='rover',
            name='longitude',
            field=models.DecimalField(decimal_places=8, max_digits=11),
        ),
    ]