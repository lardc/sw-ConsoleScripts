include("Tektronix.js")
include("DMM6500.js")

function InitMeasurementInstrument(COMports)
{
	for (var i = 0; i < COMports.length; i++)
	{
		try
		{
			TEK_PortInit(COMports[i]);
			var result = "";

			result = TEK_Exec("ID?");

			if (result.indexOf("ID") >= 0)
				return COMports[i];
		}
		catch (e) {}
	}
}
