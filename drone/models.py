from django.db import models

class Rover(models.Model):
    latitude = models.DecimalField(max_digits=11, decimal_places=8)
    longitude = models.DecimalField(max_digits=11, decimal_places=8)

    direction = models.FloatField() # 0 is due north, clockwise increment

    def __str__(self):
        latlong = '(' + str(self.latitude) + ',' + str(self.longitude) + ')'
        direct = str(self.direction)
        return '[' + latlong + ',' + direct + ']'
